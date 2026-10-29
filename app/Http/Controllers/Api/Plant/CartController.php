<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CartController —— 购物车控制器
 *
 * 连接的数据库：shumashangcheng (MySQL, port 3306)
 * 使用的表：
 *   - ssc_gouwuche  购物车表（存 member_id + product_id + quantity）
 *   - ssc_shangpin  商品表（查商品名称、价格、库存等）
 *   - ssc_pinpai    品牌表（查品牌名称）
 *
 * 路由前缀：/shuma/cart-api（见 routes/api.php）
 * 中间件：auth:sanctum + abilities:member
 */
class CartController extends BaseController
{
    /**
     * GET /shuma/cart-api —— 购物车列表
     *
     * 查 ssc_gouwuche JOIN ssc_shangpin JOIN ssc_pinpai
     * 返回当前登录用户的所有购物车商品
     */
    public function index(Request $request): JsonResponse
    {
        $memberId = (int) $request->user()->id;

        // === 核心查询：直接 JOIN 三张表 ===
        // DB::table 的 JOIN 是扁平的，字段全部在 $row 上
        // 用 select() 明确别名，避免 id 冲突
        $items = DB::table('ssc_gouwuche as g')
            ->leftJoin('ssc_shangpin as p', 'g.product_id', '=', 'p.id')
            ->leftJoin('ssc_pinpai as b', 'p.brand_id', '=', 'b.id')
            ->where('g.member_id', $memberId)
            ->orderByDesc('g.id')
            ->select(
                'g.id as cart_id',
                'g.product_id',
                'g.quantity',
                'g.spec_snapshot',
                'g.created_at as cart_created',
                'p.id as product_db_id',
                'p.sku_code',
                'p.name',
                'p.cover_image',
                'p.price',
                'p.list_price',
                'p.stock',
                'p.on_sale',
                'b.name as brand_name'
            )
            ->get()
            ->map(function ($row) {
                // 商品是否存在 + 是否上架 + 是否有库存
                $productExists = !is_null($row->product_db_id);
                $outOfStock = !$productExists || !$row->on_sale || $row->stock <= 0;
                $effectiveQty = $outOfStock ? 0 : min($row->quantity, (int) $row->stock);
                $price = (float) ($row->price ?? 0);

                return [
                    'id'            => (int) $row->cart_id,
                    'productId'     => (int) $row->product_id,
                    'skuCode'       => $row->sku_code ?? null,
                    'name'          => $row->name ?? '商品已删除',
                    'cover'         => $row->cover_image ?? null,
                    'brand'         => $row->brand_name ?? null,
                    'price'         => $price,
                    'listPrice'     => (float) ($row->list_price ?? 0),
                    'quantity'      => (int) $row->quantity,
                    'effectiveQty'  => $effectiveQty,
                    'outOfStock'    => $outOfStock,
                    'specSnapshot'  => $row->spec_snapshot ? json_decode($row->spec_snapshot, true) : null,
                    'subtotal'      => round($price * ($outOfStock ? 0 : $effectiveQty), 2),
                    'addedAt'       => $row->cart_created,
                ];
            })
            ->values();

        $totalQty    = $items->sum('quantity');
        $totalAmount = round($items->sum('subtotal'), 2);

        return $this->ok([
            'items'          => $items,
            'totalQty'       => $totalQty,
            'totalAmount'    => $totalAmount,
            'effectiveAmount'=> round($items->where('outOfStock', false)->sum('subtotal'), 2),
        ]);
    }

    /**
     * GET /shuma/cart-api/count —— 购物车总件数（角标用）
     */
    public function count(Request $request): JsonResponse
    {
        $memberId = (int) $request->user()->id;
        $count = (int) DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->sum('quantity');

        return $this->ok(['count' => $count]);
    }

    /**
     * POST /shuma/cart-api —— 加入购物车（幂等）
     *
     * 同 member_id + product_id → quantity 累加
     * 不同商品 → 新建一条
     * 写入表：ssc_gouwuche
     */
    public function add(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'productId'     => 'required|integer',
            'quantity'      => 'nullable|integer|min:1|max:99',
            'specSnapshot'  => 'nullable|array',
        ]);

        $memberId = (int) $request->user()->id;
        $productId = (int) $validated['productId'];
        $qty = max(1, (int) ($validated['quantity'] ?? 1));

        // 先查商品是否存在 + 是否上架
        $product = DB::table('ssc_shangpin')->where('id', $productId)->first();
        if (!$product) {
            return $this->fail('商品不存在', 404);
        }
        if (!$product->on_sale) {
            return $this->fail('商品已下架', 422);
        }

        // 幂等：同用户 + 同商品 → quantity 累加
        $exist = DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->where('product_id', $productId)
            ->first();

        if ($exist) {
            // 更新数量（不超过库存）
            $newQty = min($exist->quantity + $qty, max(1, $product->stock));
            DB::table('ssc_gouwuche')
                ->where('id', $exist->id)
                ->update(['quantity' => $newQty, 'updated_at' => now()]);
            $finalQty = $newQty;
        } else {
            // 新建购物车记录
            DB::table('ssc_gouwuche')->insert([
                'member_id'     => $memberId,
                'product_id'    => $productId,
                'quantity'      => min($qty, max(1, $product->stock)),
                'spec_snapshot' => isset($validated['specSnapshot'])
                    ? json_encode($validated['specSnapshot'])
                    : null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
            $finalQty = $qty;
        }

        // 返回最新角标数量
        $totalCount = (int) DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->sum('quantity');

        return $this->ok([
            'count'   => $totalCount,
            'quantity'=> $finalQty,
        ], '已加入购物车');
    }

    /**
     * PUT /shuma/cart-api/{id} —— 修改单条数量
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:1|max:99',
        ]);

        $memberId = (int) $request->user()->id;

        // 确认这条购物车记录属于当前用户
        $cart = DB::table('ssc_gouwuche')
            ->where('id', $id)
            ->where('member_id', $memberId)
            ->first();

        if (!$cart) {
            return $this->fail('购物车项不存在', 404);
        }

        // 查库存上限
        $product = DB::table('ssc_shangpin')->where('id', $cart->product_id)->first();
        $maxQty = $product ? max(1, (int) $product->stock) : 99;
        $newQty = min((int) $validated['quantity'], $maxQty);

        DB::table('ssc_gouwuche')
            ->where('id', $id)
            ->update(['quantity' => $newQty, 'updated_at' => now()]);

        $totalCount = (int) DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->sum('quantity');

        return $this->ok([
            'id'      => $id,
            'quantity'=> $newQty,
            'count'   => $totalCount,
        ]);
    }

    /**
     * DELETE /shuma/cart-api/{id} —— 删除一条
     */
    public function remove(Request $request, int $id): JsonResponse
    {
        $memberId = (int) $request->user()->id;

        $deleted = DB::table('ssc_gouwuche')
            ->where('id', $id)
            ->where('member_id', $memberId)
            ->delete();

        if (!$deleted) {
            return $this->fail('购物车项不存在', 404);
        }

        $totalCount = (int) DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->sum('quantity');

        return $this->ok([
            'count' => $totalCount,
        ], '已从购物车移除');
    }

    /**
     * DELETE /shuma/cart-api —— 清空购物车
     * （结算/登出时调用）
     */
    public function clear(Request $request): JsonResponse
    {
        $memberId = (int) $request->user()->id;

        $removedCount = DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->count();

        DB::table('ssc_gouwuche')
            ->where('member_id', $memberId)
            ->delete();

        return $this->ok([
            'removedCount' => $removedCount,
            'count'        => 0,
        ], '购物车已清空');
    }
}
