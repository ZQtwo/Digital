<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\UserCoupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends BaseController
{
    /** GET /admin/orders?status=&keyword=&page=&pageSize= 订单列表（含统计 + items） */
    public function index(Request $request): JsonResponse
    {
        // 关键：预加载 items.product（art_key/art_seed），否则 items 里 art 为 null
        $q = Order::with(['items.product:id,sku_code,name,art_key,art_seed', 'member:id,name,phone'])
            ->where('status', '!=', '__none__');

        $status = (string) $request->query('status', 'all');
        if ($status !== 'all' && array_key_exists($status, Order::STATUS_LABELS)) {
            $q->where('status', $status);
        }

        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('order_no', 'like', "%{$kw}%")
                  ->orWhere('receiver_name', 'like', "%{$kw}%")
                  ->orWhere('receiver_phone', 'like', "%{$kw}%");
            });
        }

        $page = $this->paginate($q->orderByDesc('id')->paginate($this->pageSize($request)), function ($o) {
            // items：完整返回商品清单（前端详情弹层、列表 itemSummary 都要）
            $items = $o->items->map(function ($it) {
                return [
                    'id' => (int) $it->id,
                    'productId' => (int) $it->product_id,
                    'name' => $it->product_name ?? $it->product?->name ?? '',
                    'skuCode' => $it->sku_code ?? '',
                    'price' => (float) $it->price,
                    'quantity' => (int) $it->quantity,
                    'qty' => (int) $it->quantity,
                    'subtotal' => (float) ($it->subtotal ?? (float) $it->price * $it->quantity),
                    'art' => $it->product?->art_key ?? 'product',
                    'artSeed' => (int) ($it->product?->art_seed ?? 1),
                ];
            })->all();

            return [
                'orderNo' => $o->order_no,
                'status' => $o->status,
                'statusLabel' => Order::STATUS_LABELS[$o->status] ?? $o->status,
                'memberId' => $o->member_id,
                'memberCode' => $o->member?->member_code ?? '',
                'customer' => [
                    'id' => $o->member?->id,
                    'name' => $o->member?->name ?? $o->receiver_name,
                    'phone' => $o->member?->phone ?? $o->receiver_phone,
                ],
                'receiverName' => $o->receiver_name,
                'receiverPhone' => $o->receiver_phone,
                'receiverAddress' => $o->receiver_address,
                'shipping' => [
                    'address' => trim(($o->receiver_name ?? '') . ' ' . ($o->receiver_phone ?? '') . ' ' . ($o->receiver_address ?? '')),
                ],
                'totalAmount' => (float) $o->total_amount,
                'discountAmount' => (float) $o->discount_amount,
                'freight' => (float) $o->freight,
                'payAmount' => (float) $o->pay_amount,
                'payMethod' => $o->pay_method,
                'payMethodLabel' => match ($o->pay_method) { 'wechat' => '微信支付', 'alipay' => '支付宝', 'cod' => '货到付款', default => '在线支付' },
                'itemCount' => count($items),
                'items' => $items,
                'createdAt' => $o->created_at?->toDateTimeString(),
                'payAt' => $o->pay_at?->toDateTimeString(),
                'shipAt' => $o->ship_at?->toDateTimeString(),
                'completeAt' => $o->complete_at?->toDateTimeString(),
            ];
        });

        $counts = Order::selectRaw('status, COUNT(*) AS n')->groupBy('status')->pluck('n', 'status');
        $page['stats'] = [
            'statusCounts' => collect(Order::STATUS_LABELS)->map(fn ($_, $k) => (int) ($counts[$k] ?? 0))->all(),
            'totalAmount' => (float) Order::where('status', '!=', 'cancelled')->sum('pay_amount'),
        ];

        return $this->ok($page);
    }

    /** GET /admin/orders/{orderNo} 订单详情 */
    public function show(string $orderNo): JsonResponse
    {
        $order = Order::with(['items.product:id,sku_code,art_key,art_seed', 'member:id,member_code,name,phone', 'coupon'])
            ->where('order_no', $orderNo)->first();

        if (!$order) {
            return $this->fail('订单不存在', 404);
        }

        return $this->ok([
            'orderNo' => $order->order_no,
            'status' => $order->status,
            'statusLabel' => Order::STATUS_LABELS[$order->status] ?? $order->status,
            'member' => $order->member ? [
                'id' => $order->member->id,
                'memberCode' => $order->member->member_code,
                'name' => $order->member->name,
                'phone' => $order->member->phone,
            ] : null,
            'receiverName' => $order->receiver_name,
            'receiverPhone' => $order->receiver_phone,
            'receiverAddress' => $order->receiver_address,
            'totalAmount' => (float) $order->total_amount,
            'discountAmount' => (float) $order->discount_amount,
            'freight' => (float) $order->freight,
            'payAmount' => (float) $order->pay_amount,
            'payMethod' => $order->pay_method,
            'coupon' => $order->coupon ? ['id' => $order->coupon->id, 'title' => $order->coupon->title, 'amount' => (float) $order->coupon->amount] : null,
            'remark' => $order->remark,
            'cancelReason' => $order->cancel_reason,
            'items' => $order->items->map(fn ($it) => [
                'id' => $it->id,
                'productId' => $it->product_id,
                'name' => $it->product_name,
                'skuCode' => $it->sku_code,
                'price' => (float) $it->price,
                'quantity' => $it->quantity,
                'subtotal' => (float) $it->subtotal,
                'options' => $it->spec_snapshot ?: (object) [],
                'art' => $it->product?->art_key,
                'artSeed' => $it->product?->art_seed,
            ])->all(),
            'createdAt' => $order->created_at?->toDateTimeString(),
            'payAt' => $order->pay_at?->toDateTimeString(),
            'shipAt' => $order->ship_at?->toDateTimeString(),
            'completeAt' => $order->complete_at?->toDateTimeString(),
            'cancelAt' => $order->cancel_at?->toDateTimeString(),
        ]);
    }

    /**
     * PUT /admin/orders/{orderNo}/status {status, reason?}
     * 状态机（与前台 store-orders.js 一致）：
     *  - shipped   ← pending_ship（发货）
     *  - completed ← shipped（完成）
     *  - cancelled ← pending_pay / pending_ship / shipped（取消并回补库存、释放优惠券）
     */
    public function setStatus(Request $request, string $orderNo): JsonResponse
    {
        $data = $this->validate($request, [
            'status' => 'required|in:shipped,completed,cancelled',
            'reason' => 'nullable|string|max:128',
        ]);

        $operator = $request->user()?->admin_code;
        $target = $data['status'];

        // 事务外先确认订单存在（返回 404 而非 400）
        $exists = Order::where('order_no', $orderNo)->exists();
        if (!$exists) {
            return $this->fail('订单不存在', 404);
        }

        try {
            DB::transaction(function () use ($orderNo, $target, $data, $operator) {
                // 在事务内用 lockForUpdate 重新获取订单行，并在此处校验状态
                // 避免并发请求同时通过事务外的状态检查 → 重复回补/释放
                $order = Order::with('items')->where('order_no', $orderNo)->lockForUpdate()->first();

                $allowed = [
                    'shipped' => ['pending_ship'],
                    'completed' => ['shipped'],
                    'cancelled' => ['pending_pay', 'pending_ship', 'shipped'],
                ];

                if (!in_array($order->status, $allowed[$target], true)) {
                    $label = Order::STATUS_LABELS[$order->status] ?? $order->status;
                    throw new \RuntimeException("当前状态「{$label}」不允许变更为「" . (Order::STATUS_LABELS[$target] ?? $target) . '」');
                }

                if ($target === 'shipped') {
                    $order->forceFill(['status' => 'shipped', 'ship_at' => now()])->save();
                    return;
                }

                if ($target === 'completed') {
                    $order->forceFill(['status' => 'completed', 'complete_at' => now()])->save();
                    return;
                }

                // cancelled：回补库存 + 释放优惠券 + 回退会员累计
                foreach ($order->items as $item) {
                    $p = Product::where('id', $item->product_id)->lockForUpdate()->first();
                    if ($p) {
                        $before = $p->stock;
                        $p->stock = $before + $item->quantity;
                        $p->save();

                        InventoryLog::create([
                            'group_id' => $order->order_no . '-R',
                            'product_id' => $p->id,
                            'type_code' => 'restore',
                            'quantity' => $item->quantity,
                            'before_val' => $before,
                            'after_val' => $p->stock,
                            'reason' => '后台取消订单回补',
                            'operator' => $operator,
                            'created_at' => now(),
                        ]);
                    }
                }

                if ($order->coupon_id) {
                    UserCoupon::where('id', $order->coupon_id)->update([
                        'used' => 0, 'order_id' => null, 'used_at' => null,
                    ]);
                }

                if ($order->pay_at) {
                    $order->member()->decrementEach([
                        'total_spent' => $order->pay_amount,
                        'order_count' => 1,
                    ]);
                }

                $order->forceFill([
                    'status' => 'cancelled',
                    'cancel_at' => now(),
                    'cancel_reason' => $data['reason'] ?? '管理员取消',
                ])->save();
            });
        } catch (\RuntimeException $e) {
            return $this->fail($e->getMessage());
        }

        return $this->ok(null, '订单状态已更新');
    }
}
