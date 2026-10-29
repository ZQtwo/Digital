<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\InventoryLog;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventoryController extends BaseController
{
    /** GET /admin/inventory?keyword=&filter=&page=&pageSize= 库存列表（含统计） */
    public function index(Request $request): JsonResponse
    {
        $q = Product::with(['brand:id,name', 'category:id,name']);

        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('name', 'like', "%{$kw}%")
                  ->orWhere('sku_code', 'like', "%{$kw}%");
            });
        }
        if ($request->query('filter') === 'low') {
            $q->whereColumn('stock', '<=', 'threshold');
        }

        $page = $this->paginate($q->orderBy('id')->paginate($this->pageSize($request)), function ($p) {
            return [
                'id' => $p->id,
                'skuCode' => $p->sku_code,
                'name' => $p->name,
                'brand' => $p->brand?->name,
                'brandId' => $p->brand_id,
                'category' => $p->category?->name,
                'categoryId' => $p->category_id,
                'categoryCode' => $p->category?->code,
                'art' => $p->art_key,
                'artSeed' => $p->art_seed,
                'price' => (float) $p->price,
                'stock' => (int) $p->stock,
                'threshold' => (int) $p->threshold,
                'lowStock' => $p->isLowStock(),
                'onSale' => (bool) $p->on_sale,
                'sales' => $p->sales,
            ];
        });

        $page['stats'] = $this->statsData();

        return $this->ok($page);
    }

    /** GET /admin/inventory/stats 库存统计 */
    public function stats(): JsonResponse
    {
        return $this->ok($this->statsData());
    }

    /** GET /admin/inventory/logs?productId=&typeCode=&page=&pageSize= 库存变动流水 */
    public function logs(Request $request): JsonResponse
    {
        $q = InventoryLog::with('product:id,name');

        if ($productId = $request->query('productId')) {
            $q->where('product_id', (int) $productId);
        }
        if ($typeCode = $request->query('typeCode')) {
            $q->where('type_code', $typeCode);
        }

        $page = $this->paginate($q->orderByDesc('id')->paginate($this->pageSize($request)), function ($log) {
            return [
                'id' => $log->id,
                'groupId' => $log->group_id,
                'productId' => $log->product_id,
                'productName' => $log->product?->name,
                'typeCode' => $log->type_code,
                'quantity' => (int) $log->quantity,
                'beforeVal' => (int) $log->before_val,
                'afterVal' => (int) $log->after_val,
                'reason' => $log->reason,
                'operator' => $log->operator,
                'undoOf' => $log->undo_of,
                'createdAt' => $log->created_at?->toDateTimeString(),
            ];
        });

        return $this->ok($page);
    }

    /** PUT /admin/inventory/{productId}/stock 设定商品库存 */
    public function setStock(Request $request, int $productId): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:0',
            'reason' => 'nullable|string|max:128',
        ]);

        $result = DB::transaction(function () use ($productId, $data, $request) {
            $product = Product::where('id', $productId)->lockForUpdate()->first();
            if (!$product) {
                return null;
            }

            $before = (int) $product->stock;
            $after = (int) $data['quantity'];
            $product->stock = $after;
            $product->save();

            InventoryLog::create([
                'group_id' => 'SET' . now()->format('YmdHis'),
                'product_id' => $product->id,
                'type_code' => 'set',
                'quantity' => $after,
                'before_val' => $before,
                'after_val' => $after,
                'reason' => $data['reason'] ?? '后台设定库存',
                'operator' => $request->user()?->admin_code,
                'created_at' => now(),
            ]);

            return ['beforeVal' => $before, 'afterVal' => $after];
        });

        if ($result === null) {
            return $this->fail('商品不存在', 404);
        }

        return $this->ok($result, '库存已设定');
    }

    /** PUT /admin/inventory/{productId}/threshold 设置库存预警阈值 */
    public function setThreshold(Request $request, int $productId): JsonResponse
    {
        $data = $request->validate([
            'threshold' => 'required|integer|min:0',
        ]);

        $product = Product::find($productId);
        if (!$product) {
            return $this->fail('商品不存在', 404);
        }

        $product->threshold = (int) $data['threshold'];
        $product->save();

        return $this->ok(['threshold' => (int) $product->threshold], '阈值已更新');
    }

    /** POST /admin/inventory/adjust 单品入库/出库（quantity 正=入库 负=出库） */
    public function adjust(Request $request): JsonResponse
    {
        $data = $request->validate([
            'productId' => 'required|integer',
            'quantity' => 'required|integer|not_in:0',
            'reason' => 'nullable|string|max:128',
        ]);

        $quantity = (int) $data['quantity'];

        try {
            $result = DB::transaction(function () use ($data, $quantity, $request) {
                $product = Product::where('id', (int) $data['productId'])->lockForUpdate()->first();
                if (!$product) {
                    throw new RuntimeException('商品不存在');
                }

                $before = (int) $product->stock;
                $after = $before + $quantity;
                if ($quantity < 0 && $after < 0) {
                    throw new RuntimeException("「{$product->name}」库存不足，仅剩 {$before} 件");
                }
                $product->stock = $after;
                $product->save();

                $log = InventoryLog::create([
                    'group_id' => 'ADJ' . now()->format('YmdHis'),
                    'product_id' => $product->id,
                    'type_code' => $quantity > 0 ? 'in' : 'out',
                    'quantity' => abs($quantity),
                    'before_val' => $before,
                    'after_val' => $after,
                    'reason' => $data['reason'] ?? ($quantity > 0 ? '手动入库' : '手动出库'),
                    'operator' => $request->user()?->admin_code,
                    'created_at' => now(),
                ]);

                return ['logId' => $log->id, 'beforeVal' => $before, 'afterVal' => $after];
            });
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage());
        }

        return $this->ok($result, '库存已调整');
    }

    /** POST /admin/inventory/batch 批量调整库存（同一批次同一事务） */
    public function batch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|integer',
            'items.*.quantity' => 'required|integer|not_in:0',
            'reason' => 'nullable|string|max:128',
        ]);

        $groupId = 'BAT' . now()->format('YmdHis') . sprintf('%02d', random_int(0, 99));

        try {
            DB::transaction(function () use ($data, $groupId, $request) {
                foreach ($data['items'] as $item) {
                    $quantity = (int) $item['quantity'];

                    $product = Product::where('id', (int) $item['productId'])->lockForUpdate()->first();
                    if (!$product) {
                        throw new RuntimeException('商品不存在');
                    }

                    $before = (int) $product->stock;
                    $after = $before + $quantity;
                    if ($quantity < 0 && $after < 0) {
                        throw new RuntimeException("「{$product->name}」库存不足，仅剩 {$before} 件");
                    }
                    $product->stock = $after;
                    $product->save();

                    InventoryLog::create([
                        'group_id' => $groupId,
                        'product_id' => $product->id,
                        'type_code' => $quantity > 0 ? 'in' : 'out',
                        'quantity' => abs($quantity),
                        'before_val' => $before,
                        'after_val' => $after,
                        'reason' => $data['reason'] ?? '批量调整库存',
                        'operator' => $request->user()?->admin_code,
                        'created_at' => now(),
                    ]);
                }
            });
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage());
        }

        return $this->ok(['groupId' => $groupId], '批量调整已完成');
    }

    /** POST /admin/inventory/logs/{id}/undo 撤销流水（库存恢复为该流水前值） */
    public function undo(Request $request, int $id): JsonResponse
    {
        $log = InventoryLog::find($id);
        if (!$log) {
            return $this->fail('流水不存在', 404);
        }
        if ($log->type_code === 'undo') {
            return $this->fail('该流水已是撤销记录');
        }
        if (in_array($log->type_code, ['order', 'restore'], true)) {
            return $this->fail('订单相关流水请在订单中处理');
        }
        // 幂等性检查：该原始流水是否已被撤销过（已有 undo_of 指向它 group_id 的撤销记录）
        if (InventoryLog::where('undo_of', $log->group_id)->exists()) {
            return $this->fail('该流水已被撤销过，不可重复操作');
        }

        try {
            $afterVal = DB::transaction(function () use ($log, $request) {
                $product = Product::where('id', $log->product_id)->lockForUpdate()->first();
                if (!$product) {
                    throw new RuntimeException('商品不存在');
                }

                $current = (int) $product->stock;
                $target = (int) $log->before_val;
                $product->stock = $target;
                $product->save();

                InventoryLog::create([
                    'group_id' => 'UNDO' . now()->format('YmdHis'),
                    'product_id' => $product->id,
                    'type_code' => 'undo',
                    'quantity' => $target - $current,
                    'before_val' => $current,
                    'after_val' => $target,
                    'reason' => '撤销流水 ' . $log->group_id,
                    'operator' => $request->user()?->admin_code,
                    'undo_of' => $log->group_id,
                    'created_at' => now(),
                ]);

                return $target;
            });
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 404);
        }

        return $this->ok(['afterVal' => $afterVal], '已撤销');
    }

    /** 库存统计聚合 */
    private function statsData(): array
    {
        $agg = Product::selectRaw('COUNT(*) AS total, COALESCE(SUM(stock),0) AS total_stock, COALESCE(SUM(stock * price),0) AS stock_value')->first();

        return [
            'total' => (int) ($agg->total ?? 0),
            'totalStock' => (int) ($agg->total_stock ?? 0),
            'lowStock' => Product::whereColumn('stock', '<=', 'threshold')->count(),
            'outOfStock' => Product::where('stock', 0)->count(),
            'stockValue' => (float) ($agg->stock_value ?? 0),
        ];
    }
}
