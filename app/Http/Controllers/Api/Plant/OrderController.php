<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Address;
use App\Models\InventoryLog;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ReturnOrder;
use App\Models\Review;
use App\Models\UserCoupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends BaseController
{
    /** GET /orders?status=&page=&pageSize= 我的订单列表 */
    public function index(Request $request): JsonResponse
    {
        // 关键：items.product 也预加载，否则 art_key / art_seed 为 null
        $q = Order::with(['items.product:id,sku_code,name,art_key,art_seed'])
            ->where('member_id', $request->user()->id);

        $status = $request->query('status', 'all');
        if ($status !== 'all' && array_key_exists($status, Order::STATUS_LABELS)) {
            $q->where('status', $status);
        }

        $page = $this->paginate($q->orderByDesc('id')->paginate($this->pageSize($request, 10)), function ($o) {
            return $this->orderBrief($o);
        });

        // 各状态计数（tab 角标）
        $counts = Order::where('member_id', $request->user()->id)
            ->selectRaw('status, COUNT(*) AS n')->groupBy('status')->pluck('n', 'status');
        $page['statusCounts'] = collect(Order::STATUS_LABELS)
            ->map(fn ($_, $k) => (int) ($counts[$k] ?? 0))->all();
        $page['statusCounts']['all'] = (int) array_sum($page['statusCounts']);

        return $this->ok($page);
    }

    /** GET /orders/{orderNo} 订单详情 */
    public function show(Request $request, string $orderNo): JsonResponse
    {
        $order = Order::with(['items.product:id,sku_code,art_key,art_seed', 'coupon'])
            ->where('order_no', $orderNo)
            ->where('member_id', $request->user()->id)
            ->first();

        if (!$order) {
            return $this->fail('订单不存在', 404);
        }

        return $this->ok($this->orderDetail($order));
    }

    /** POST /orders 创建订单（事务：锁库存→扣库存→建单→用券） */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'items' => 'required|array|min:1',
            'items.*.productId' => 'nullable|integer',
            'items.*.skuCode' => 'nullable|string|max:32',
            'items.*.quantity' => 'required|integer|min:1|max:999',
            'items.*.options' => 'nullable|array',
            'addressId' => 'nullable|integer',
            'couponId' => 'nullable|integer',
            'remark' => 'nullable|string|max:256',
            'payMethod' => 'nullable|string|max:16',
        ]);

        $member = $request->user();

        // addressId 为空 → 自动取默认地址
        $address = null;
        if (!empty($data['addressId'])) {
            $address = Address::where('id', $data['addressId'])
                ->where('member_id', $member->id)->first();
        }
        if (!$address) {
            $address = Address::where('member_id', $member->id)
                ->where(function ($q) {
                    $q->where('is_default', 1)->orWhereNull('is_default');
                })->orderByDesc('is_default')->first();
        }
        if (!$address) {
            return $this->fail('请先添加收货地址', 400);
        }

        // 统一解析 items：支持传 productId（整数DB id）或 skuCode（字符串）
        $lines = collect($data['items'])->map(function ($it) {
            $id = $it['productId'] ?? null;
            if (!$id && !empty($it['skuCode'])) {
                $p = Product::where('sku_code', $it['skuCode'])->first();
                $id = $p?->id;
            }
            return [
                'productId' => (int) $id,
                'quantity' => (int) $it['quantity'],
                'options' => $it['options'] ?? [],
            ];
        })->filter(fn ($it) => $it['productId'] > 0)->values();

        $productIds = $lines->pluck('productId')->unique()->all();
        $products = Product::whereIn('id', $productIds)->where('on_sale', 1)->get()->keyBy('id');

        foreach ($lines as $line) {
            $p = $products->get($line['productId']);
            if (!$p) {
                return $this->fail("商品(ID:{$line['productId']})不存在或已下架");
            }
            if ($p->stock < $line['quantity']) {
                return $this->fail("「{$p->name}」库存不足，仅剩 {$p->stock} 件");
            }
        }

        // 商品小计
        $total = $lines->sum(fn ($l) => (float) $products[$l['productId']]->price * $l['quantity']);

        // 运费（与前端规则对齐：满299免运费，否则12元）
        $freight = $total >= 299 ? 0 : 12;

        // 优惠券校验
        $coupon = null;
        $discount = 0;
        if (!empty($data['couponId'])) {
            $coupon = UserCoupon::where('id', $data['couponId'])
                ->where('member_id', $member->id)
                ->where('used', 0)
                ->where('expire_at', '>', now())
                ->first();
            if (!$coupon) {
                return $this->fail('优惠券不可用');
            }
            if ($total < (float) $coupon->threshold) {
                return $this->fail("未达到优惠券门槛（满 {$coupon->threshold} 元可用）");
            }
            $discount = (float) $coupon->amount;
        }

        $payAmount = max(0, $total - $discount) + $freight;
        $orderNo = 'SO' . now()->format('YmdHis') . str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        $order = DB::transaction(function () use ($lines, $products, $data, $address, $coupon, $discount, $freight, $total, $payAmount, $orderNo, $member) {
            foreach ($lines as $line) {
                // 锁行扣库存（并发安全）
                $p = Product::where('id', $line['productId'])->lockForUpdate()->first();
                if (!$p || $p->stock < $line['quantity']) {
                    throw new \RuntimeException("「{$p?->name}」库存不足");
                }
                $before = $p->stock;
                $p->stock = $before - $line['quantity'];
                $p->save();

                InventoryLog::create([
                    'group_id' => $orderNo,
                    'product_id' => $p->id,
                    'type_code' => 'order',
                    'quantity' => -$line['quantity'],
                    'before_val' => $before,
                    'after_val' => $p->stock,
                    'reason' => '下单扣减',
                    'operator' => $member->member_code,
                    'created_at' => now(),
                ]);
            }

            $order = Order::create([
                'order_no' => $orderNo,
                'member_id' => $member->id,
                'status' => 'pending_pay',
                'total_amount' => $total,
                'discount_amount' => $discount,
                'freight' => $freight,
                'pay_amount' => $payAmount,
                'coupon_id' => $coupon?->id,
                'pay_method' => $data['payMethod'] ?? null,
                'receiver_name' => $address->receiver_name,
                'receiver_phone' => $address->phone,
                'receiver_address' => $address->fullRegion() . ' ' . $address->detail,
                'remark' => $data['remark'] ?? null,
            ]);

            foreach ($lines as $line) {
                $p = $products[$line['productId']];
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $p->id,
                    'product_name' => $p->name,
                    'sku_code' => $p->sku_code,
                    'price' => $p->price,
                    'quantity' => $line['quantity'],
                    'spec_snapshot' => $line['options'] ?: null,
                    'subtotal' => round((float) $p->price * $line['quantity'], 2),
                ]);
            }

            // 标记优惠券已使用
            if ($coupon) {
                $coupon->forceFill(['used' => 1, 'order_id' => $order->id, 'used_at' => now()])->save();
            }

            return $order;
        });

        return $this->ok([
            'orderNo' => $order->order_no,
            'payAmount' => (float) $order->pay_amount,
        ], '订单创建成功');
    }

    /** PUT /orders/{orderNo} 修改待付款订单（收货地址/支付方式/备注），地址按 addressId 重新快照 */
    public function update(Request $request, string $orderNo): JsonResponse
    {
        $order = $this->findOwned($request, $orderNo);
        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if ($order->status !== 'pending_pay') {
            return $this->fail('只有待付款订单可以修改');
        }

        try {
            $data = $this->validate($request, [
                'addressId' => ['required', 'integer', 'min:1'],
                'payMethod' => ['nullable', 'string', 'max:16'],
                'remark' => ['nullable', 'string', 'max:200'],
            ]);
        } catch (ValidationException $e) {
            $msg = collect($e->errors())->flatten()->first() ?: '参数错误';
            return $this->fail($msg);
        }

        // 新地址必须是自己的地址簿里的地址
        $address = Address::where('id', $data['addressId'])
            ->where('member_id', $request->user()->id)
            ->first();
        if (!$address) {
            return $this->fail('收货地址不存在，请重新选择');
        }

        $order->forceFill([
            'receiver_name' => $address->receiver_name,
            'receiver_phone' => $address->phone,
            'receiver_address' => trim($address->fullRegion() . ' ' . $address->detail),
            'pay_method' => $data['payMethod'] ?? $order->pay_method,
            'remark' => array_key_exists('remark', $data) ? $data['remark'] : $order->remark,
        ])->save();

        return $this->ok([
            'orderNo' => $order->order_no,
            'receiverName' => $order->receiver_name,
            'receiverPhone' => $order->receiver_phone,
            'receiverAddress' => $order->receiver_address,
        ], '订单已更新');
    }

    /** POST /orders/{orderNo}/pay {payMethod} 支付订单（pending_pay→pending_ship） */
    public function pay(Request $request, string $orderNo): JsonResponse
    {
        // 兼容 camelCase (payMethod) 和 snake_case (pay_method)
        $payMethod = $request->input('payMethod') ?? $request->input('pay_method', 'wechat');
        if (!is_string($payMethod) || strlen($payMethod) > 16) {
            return $this->fail('支付方式格式错误');
        }

        $order = $this->findOwned($request, $orderNo);
        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if ($order->status !== 'pending_pay') {
            return $this->fail('只有待付款订单可以支付');
        }

        DB::transaction(function () use ($order, $payMethod) {
            $order->forceFill([
                'status' => 'pending_ship',
                'pay_method' => $payMethod,
                'pay_at' => now(),
            ])->save();

            // 累计会员消费
            $order->member()->incrementEach([
                'total_spent' => $order->pay_amount,
                'order_count' => 1,
            ]);
        });

        return $this->ok(null, '支付成功');
    }

    /** POST /orders/{orderNo}/cancel {reason?} 取消订单（回补库存/释放优惠券） */
    public function cancel(Request $request, string $orderNo): JsonResponse
    {
        $data = $this->validate($request, ['reason' => 'nullable|string|max:128']);

        $order = $this->findOwned($request, $orderNo);
        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if (!$order->isCancellable()) {
            return $this->fail('当前状态「' . Order::STATUS_LABELS[$order->status] . '」不可取消');
        }

        DB::transaction(function () use ($order, $data) {
            // 回补库存
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
                        'reason' => '订单取消回补',
                        'operator' => $order->member?->member_code,
                        'created_at' => now(),
                    ]);
                }
            }

            // 释放优惠券
            if ($order->coupon_id) {
                UserCoupon::where('id', $order->coupon_id)->update([
                    'used' => 0, 'order_id' => null, 'used_at' => null,
                ]);
            }

            // 已支付订单回退会员累计
            if ($order->pay_at) {
                $order->member()->decrementEach([
                    'total_spent' => $order->pay_amount,
                    'order_count' => 1,
                ]);
            }

            $order->forceFill([
                'status' => 'cancelled',
                'cancel_at' => now(),
                'cancel_reason' => $data['reason'] ?? '买家取消',
            ])->save();
        });

        return $this->ok(null, '订单已取消');
    }

    /** POST /orders/{orderNo}/confirm 确认收货（shipped→completed） */
    public function confirm(Request $request, string $orderNo): JsonResponse
    {
        $order = $this->findOwned($request, $orderNo);
        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if ($order->status !== 'shipped') {
            return $this->fail('只有已发货订单可以确认收货');
        }

        $order->forceFill(['status' => 'completed', 'complete_at' => now()])->save();

        return $this->ok(null, '已确认收货');
    }

    /** DELETE /orders/{orderNo} 删除订单（仅已取消且无退货单） */
    public function destroy(Request $request, string $orderNo): JsonResponse
    {
        $order = $this->findOwned($request, $orderNo);
        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if ($order->status !== 'cancelled') {
            return $this->fail('仅已取消订单可以删除');
        }
        if (ReturnOrder::where('order_id', $order->id)->exists()) {
            return $this->fail('该订单存在退换货记录，无法删除');
        }

        $order->items()->delete();
        $order->delete();

        return $this->ok(null, '订单已删除');
    }

    /* ------------------------------------------------------------------ */

    protected function findOwned(Request $request, string $orderNo): ?Order
    {
        return Order::where('order_no', $orderNo)
            ->where('member_id', $request->user()->id)
            ->first();
    }

    /** 订单简要（列表项） */
    protected function payMethodLabel(?string $code): string
    {
        return match ($code) {
            'wechat' => '微信支付',
            'alipay' => '支付宝',
            'balance' => '余额支付',
            'bank' => '银行卡',
            default => $code ?? '在线支付',
        };
    }

    protected function orderBrief(Order $o): array
    {
        // 统一构造 items（所有字段 100% 有值，前端拿到直接渲染）
        $items = $o->items->map(function ($it) {
            // 优先用订单项里存的 product_name，fallback 到产品表
            $name = $it->product_name ?? $it->product?->name ?? '';
            $sku  = $it->sku_code   ?? $it->product?->sku_code ?? '';
            // art / artSeed：订单里没存，从关联产品取
            $art     = $it->product?->art_key  ?? 'product';
            $artSeed = $it->product?->art_seed ?? 1;

            // options：可能是 JSON string 或 array
            $opts = $it->spec_snapshot;
            if (is_string($opts)) {
                $decoded = json_decode($opts, true);
                $opts = is_array($decoded) ? $decoded : [];
            } elseif (!is_array($opts)) {
                $opts = [];
            }

            return [
                'id'         => (int) $it->id,
                'productId'  => (int) $it->product_id,
                'name'       => $name,
                'skuCode'    => $sku,
                'price'      => (float) $it->price,
                'quantity'   => (int) $it->quantity,
                'subtotal'   => (float) ($it->subtotal ?? (float) $it->price * $it->quantity),
                'options'    => $opts,
                'commentId'  => $it->comment_id,
                'art'        => $art,
                'artSeed'    => (int) $artSeed,
            ];
        })->all();

        // 评价回显：按 commentId 批量取评价（评分/内容/匿名），前端"已评价"标签直接用
        $commentIds = collect($items)->pluck('commentId')->filter()->unique()->values()->all();
        $reviewMap = $commentIds
            ? Review::whereIn('id', $commentIds)->get()->keyBy('id')
            : collect();
        foreach ($items as &$it) {
            $it['rated'] = !empty($it['commentId']);
            $r = !empty($it['commentId']) ? $reviewMap->get($it['commentId']) : null;
            $it['commentRating']    = $r ? (int) $r->rating : null;
            $it['commentContent']   = $r ? (string) $r->content : null;
            $it['commentAnonymous'] = $r ? (bool) $r->anonymous : false;
        }
        unset($it);

        // 地址：平铺字段 + 嵌套 address 对象（前端二选一都能用）
        $receiverAddress = $o->receiver_address ?? '';
        $receiverName    = $o->receiver_name    ?? '';
        $receiverPhone   = $o->receiver_phone   ?? '';

        return [
            'orderNo'       => $o->order_no,
            'status'        => $o->status,
            'statusLabel'   => Order::STATUS_LABELS[$o->status] ?? $o->status,
            'totalAmount'   => (float) $o->total_amount,
            'discountAmount'=> (float) $o->discount_amount,
            'freight'       => (float) $o->freight,
            'payAmount'     => (float) $o->pay_amount,
            'payMethod'     => $o->pay_method ?? '',
            'payMethodLabel'=> $this->payMethodLabel($o->pay_method),
            'receiverName'     => $receiverName,
            'receiverPhone'    => $receiverPhone,
            'receiverAddress'  => $receiverAddress,
            // 嵌套 address 对象（前端 confirm 页直接读 order.address.name）
            'address' => [
                'name'    => $receiverName,
                'phone'   => $receiverPhone,
                'region'  => '',
                'detail'  => $receiverAddress,
                'receiverAddress' => $receiverAddress,
            ],
            'itemCount' => count($items),
            'items'     => $items,
            'createdAt' => $o->created_at?->toDateTimeString(),
            'ts'        => $o->created_at?->timestamp,
        ];
    }

    /** 订单详情 */
    protected function orderDetail(Order $o): array
    {
        return $this->orderBrief($o) + [
            'receiverName' => $o->receiver_name,
            'receiverPhone' => $o->receiver_phone,
            'receiverAddress' => $o->receiver_address,
            'remark' => $o->remark,
            'coupon' => $o->coupon ? [
                'id' => $o->coupon->id,
                'title' => $o->coupon->title,
                'amount' => (float) $o->coupon->amount,
            ] : null,
            'payAt' => $o->pay_at?->toDateTimeString(),
            'shipAt' => $o->ship_at?->toDateTimeString(),
            'completeAt' => $o->complete_at?->toDateTimeString(),
            'cancelAt' => $o->cancel_at?->toDateTimeString(),
            'cancelReason' => $o->cancel_reason,
        ];
    }
}
