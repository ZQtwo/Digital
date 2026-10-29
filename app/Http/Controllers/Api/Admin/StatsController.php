<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\InventoryLog;
use App\Models\Member;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends BaseController
{
    /** GET /admin/stats/overview 主面板总览（库存 KPI + 订单 KPI + 分布 + Top10 + 预警 + 最近流水） */
    public function overview(): JsonResponse
    {
        // —— 库存 KPI ——
        $agg = Product::selectRaw('COUNT(*) AS sku, COALESCE(SUM(stock),0) AS total_stock, COALESCE(AVG(stock),0) AS avg_stock')->first();
        $skuCount = (int) ($agg->sku ?? 0);
        $totalStock = (int) ($agg->total_stock ?? 0);
        $lowCount = (int) Product::whereColumn('stock', '<=', 'threshold')->where('stock', '>', 0)->count();
        $outCount = (int) Product::where('stock', 0)->count();

        // —— 分类库存分布（上卷到一级分类）——
        $dist = DB::table('ssc_shangpin as p')
            ->join('ssc_fenlei as f', 'p.category_id', '=', 'f.id')
            ->leftJoin('ssc_fenlei as top', 'f.parent_id', '=', 'top.id')
            ->selectRaw('COALESCE(top.id, f.id) AS id, COALESCE(top.name, f.name) AS name, COALESCE(SUM(p.stock),0) AS stock')
            ->groupByRaw('COALESCE(top.id, f.id), COALESCE(top.name, f.name)')
            ->orderByDesc('stock')
            ->get()
            ->map(fn ($r) => ['id' => (int) $r->id, 'name' => $r->name, 'stock' => (int) $r->stock])
            ->all();

        // —— Top10 库存 ——
        $top = Product::orderByDesc('stock')->limit(10)->get()->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'art' => $p->art_key,
            'artSeed' => (int) $p->art_seed,
            'stock' => (int) $p->stock,
        ])->all();

        // —— 预警清单 ——
        $alerts = Product::whereColumn('stock', '<=', 'threshold')
            ->orderBy('stock')->orderBy('id')->limit(50)->get()->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'stock' => (int) $p->stock,
                'threshold' => (int) $p->threshold,
                'status' => (int) $p->stock === 0 ? 'out' : 'low',
            ])->all();

        // —— 最近 5 条流水 + 今日条数 ——
        $toneMap = ['in' => ['in', '入库'], 'restore' => ['in', '返还'], 'order' => ['out', '订单出库'], 'set' => ['neutral', '设定'], 'out' => ['out', '出库']];
        $logs = InventoryLog::with('product:id,name')->orderByDesc('id')->limit(5)->get()->map(function ($l) use ($toneMap) {
            $m = $toneMap[$l->type_code] ?? ['neutral', $l->type_code];
            return [
                'name' => $l->product?->name,
                'type' => $l->type_code,
                'tone' => $m[0],
                'label' => $m[1],
                'delta' => (int) $l->quantity,
                'after' => (int) $l->after_val,
                'reason' => (string) $l->reason,
            ];
        })->all();
        $todayCount = (int) InventoryLog::where('created_at', '>=', now()->startOfDay())->count();

        // —— 订单 KPI ——
        $counts = Order::selectRaw('status, COUNT(*) AS n')->groupBy('status')->pluck('n', 'status');
        $nonCancelled = Order::where('status', '!=', 'cancelled')->count();
        $totalSales = (float) Order::where('status', '!=', 'cancelled')->sum('pay_amount');

        return $this->ok([
            'stats' => [
                'skuCount' => $skuCount,
                'totalStock' => $totalStock,
                'avgStock' => $skuCount > 0 ? (int) round($totalStock / $skuCount) : 0,
                'alertCount' => $lowCount + $outCount,
                'lowCount' => $lowCount,
                'outCount' => $outCount,
                'todayCount' => $todayCount,
            ],
            'orderStats' => [
                'totalOrders' => (int) Order::count(),
                'pendingPay' => (int) ($counts['pending_pay'] ?? 0),
                'pendingShip' => (int) ($counts['pending_ship'] ?? 0),
                'shipped' => (int) ($counts['shipped'] ?? 0),
                'totalSales' => $totalSales,
                'avgOrderAmount' => $nonCancelled > 0 ? round($totalSales / $nonCancelled, 2) : 0.0,
            ],
            'dist' => $dist,
            'top10' => $top,
            'alerts' => $alerts,
            'logs' => $logs,
        ]);
    }

    /** GET /admin/stats/orders 订单统计 */
    public function orders(): JsonResponse
    {
        $counts = Order::selectRaw('status, COUNT(*) AS n')->groupBy('status')->pluck('n', 'status');

        $base = Order::where('status', '!=', 'cancelled');
        $nonCancelled = (int) (clone $base)->count();
        $totalSales = (float) (clone $base)->sum('pay_amount');

        return $this->ok([
            'statusCounts' => collect(Order::STATUS_LABELS)->map(fn ($_, $k) => (int) ($counts[$k] ?? 0))->all(),
            'totalOrders' => (int) Order::count(),
            'totalSales' => $totalSales,
            'avgOrderAmount' => $nonCancelled > 0 ? round($totalSales / $nonCancelled, 2) : 0.0,
        ]);
    }

    /** GET /admin/stats/sales?days=14 销售趋势（按天，近 N 天含今天） */
    public function sales(Request $request): JsonResponse
    {
        $days = max(1, min(90, (int) $request->query('days', 14)));
        $from = now()->subDays($days - 1)->startOfDay();
        $to = now()->endOfDay();

        $rows = DB::table('ssc_dingdan')
            ->whereBetween('created_at', [$from, $to])
            ->where('status', '!=', 'cancelled')
            ->selectRaw('DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(pay_amount),0) AS sales')
            ->groupByRaw('DATE(created_at)')
            ->get()
            ->keyBy('date');

        $list = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $row = $rows[$date] ?? null;
            $list[] = [
                'date' => $date,
                'orders' => (int) ($row->orders ?? 0),
                'sales' => (float) ($row->sales ?? 0),
            ];
        }

        return $this->ok(['list' => $list]);
    }

    /** GET /admin/stats/products 商品/分类统计 */
    public function products(): JsonResponse
    {
        // 销售按一级分类归集（商品挂二级分类时上卷到父分类）
        $rows = DB::table('ssc_dingdan_xiangmu')
            ->join('ssc_shangpin', 'ssc_dingdan_xiangmu.product_id', '=', 'ssc_shangpin.id')
            ->join('ssc_fenlei', 'ssc_shangpin.category_id', '=', 'ssc_fenlei.id')
            ->leftJoin('ssc_fenlei AS top', 'ssc_fenlei.parent_id', '=', 'top.id')
            ->selectRaw('COALESCE(top.name, ssc_fenlei.name) AS category, COALESCE(SUM(ssc_dingdan_xiangmu.subtotal),0) AS amount')
            ->groupByRaw('COALESCE(top.name, ssc_fenlei.name)')
            ->orderByDesc('amount')
            ->get();

        $total = (float) $rows->sum('amount');
        $categorySales = $rows->map(fn ($r) => [
            'category' => $r->category,
            'amount' => (float) $r->amount,
            'percent' => $total > 0 ? round($r->amount / $total * 100, 1) : 0.0,
        ])->all();

        $topProducts = Product::orderByDesc('sales')->limit(10)->get()->map(fn ($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'skuCode' => $p->sku_code,
            'sales' => (int) $p->sales,
            'price' => (float) $p->price,
            'stock' => (int) $p->stock,
        ])->all();

        return $this->ok([
            'categorySales' => $categorySales,
            'topProducts' => $topProducts,
        ]);
    }

    /** GET /admin/stats/members 会员统计 */
    public function members(): JsonResponse
    {
        // 生效等级分布：手动指定 level_override 优先
        $levelCounts = [];
        foreach (['normal', 'silver', 'gold', 'platinum'] as $level) {
            $levelCounts[$level] = Member::where(fn ($w) => $w->where('level_override', $level)
                ->orWhere(fn ($x) => $x->whereNull('level_override')->where('level_code', $level)))
                ->count();
        }

        $rows = DB::table('ssc_yonghu')
            ->where('created_at', '>=', now()->subDays(13)->startOfDay())
            ->selectRaw('DATE(created_at) AS date, COUNT(*) AS count')
            ->groupByRaw('DATE(created_at)')
            ->get()
            ->keyBy('date');

        $daily = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $daily[] = [
                'date' => $date,
                'count' => (int) ($rows[$date]->count ?? 0),
            ];
        }

        return $this->ok([
            'total' => (int) Member::count(),
            'levelCounts' => $levelCounts,
            'newLast30' => (int) Member::where('created_at', '>=', now()->subDays(30)->startOfDay())->count(),
            'daily' => $daily,
        ]);
    }
}
