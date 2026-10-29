<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Member;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends BaseController
{
    /** GET /admin/dashboard 工作台聚合数据 */
    public function index(): JsonResponse
    {
        $today = now()->startOfDay();

        $orderAgg = Order::selectRaw("
                COUNT(*) AS total_orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN pay_amount END), 0) AS total_sales,
                COALESCE(SUM(CASE WHEN created_at >= ? AND status != 'cancelled' THEN pay_amount END), 0) AS today_sales,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS today_orders
            ", [$today, $today])->first();

        $statusCounts = Order::selectRaw('status, COUNT(*) AS n')
            ->groupBy('status')->pluck('n', 'status');

        $lowStock = Product::where('on_sale', 1)
            ->whereColumn('stock', '<=', 'threshold')
            ->orderBy('stock')
            ->limit(8)
            ->get(['id', 'name', 'sku_code', 'stock', 'threshold']);

        $topSales = Product::where('on_sale', 1)->orderByDesc('sales')->limit(5)
            ->get(['id', 'name', 'sales', 'stock']);

        return $this->ok([
            'today' => [
                'orders' => (int) ($orderAgg->today_orders ?? 0),
                'sales' => (float) ($orderAgg->today_sales ?? 0),
            ],
            'total' => [
                'orders' => (int) ($orderAgg->total_orders ?? 0),
                'sales' => (float) ($orderAgg->total_sales ?? 0),
                'members' => Member::count(),
                'products' => Product::where('on_sale', 1)->count(),
            ],
            'pending' => [
                'pendingPay' => (int) ($statusCounts['pending_pay'] ?? 0),
                'pendingShip' => (int) ($statusCounts['pending_ship'] ?? 0),
                'pendingReturns' => ReturnOrder::where('status', 'pending')->count(),
                'lowStock' => Product::where('on_sale', 1)->whereColumn('stock', '<=', 'threshold')->count(),
            ],
            'statusCounts' => collect(Order::STATUS_LABELS)->map(fn ($_, $k) => (int) ($statusCounts[$k] ?? 0))->all(),
            'lowStockList' => $lowStock->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'skuCode' => $p->sku_code,
                'stock' => $p->stock,
                'threshold' => $p->threshold,
            ])->all(),
            'topSales' => $topSales->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sales' => $p->sales,
                'stock' => $p->stock,
            ])->all(),
        ]);
    }
}
