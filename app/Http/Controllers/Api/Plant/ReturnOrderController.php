<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Order;
use App\Models\ReturnOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReturnOrderController extends BaseController
{
    /** GET /returns 我的退换货申请列表 */
    public function index(Request $request): JsonResponse
    {
        $list = ReturnOrder::with('order:order_no,id,status,total_amount,pay_amount')
            ->where('member_id', $request->user()->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($r) => $this->brief($r))->all();

        return $this->ok(['list' => $list]);
    }

    /** POST /returns 申请退换货（已发货/已完成订单） */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'orderNo' => 'required|string',
            'typeCode' => 'required|in:refund,refund_only,exchange',
            'reason' => 'nullable|string|max:256',
            'amount' => 'nullable|numeric|min:0',
        ]);

        $order = Order::where('order_no', $data['orderNo'])
            ->where('member_id', $request->user()->id)
            ->first();

        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if (!in_array($order->status, ['shipped', 'completed'], true)) {
            return $this->fail('已发货/已完成订单才能申请退换货');
        }
        if (ReturnOrder::where('order_id', $order->id)->where('status', '!=', 'rejected')->exists()) {
            return $this->fail('该订单已有进行中的退换货申请');
        }

        // 退款金额上限校验：不得超过订单实付金额；换货类型不接受金额参数
        $maxAmount = (float) $order->pay_amount;
        if ($data['typeCode'] === 'exchange') {
            $data['amount'] = null;
        } else {
            if (isset($data['amount']) && (float) $data['amount'] > $maxAmount) {
                return $this->fail('退款金额不能超过订单实付金额（' . number_format($maxAmount, 2) . '）');
            }
        }

        $return = DB::transaction(function () use ($data, $order, $request, $maxAmount) {
            return ReturnOrder::create([
                'return_no' => 'RT' . now()->format('YmdHis') . str_pad((string) random_int(0, 99), 2, '0', STR_PAD_LEFT),
                'order_id' => $order->id,
                'member_id' => $request->user()->id,
                'type_code' => $data['typeCode'],
                'reason' => $data['reason'] ?? null,
                'amount' => $data['typeCode'] === 'exchange' ? null : ($data['amount'] ?? $maxAmount),
                'status' => 'pending',
                'status_timeline' => [
                    ['status' => 'pending', 'label' => '待处理', 'at' => now()->toDateTimeString()],
                ],
            ]);
        });

        return $this->ok(['returnNo' => $return->return_no], '退换货申请已提交');
    }

    protected function brief(ReturnOrder $r): array
    {
        return [
            'id' => $r->id,
            'returnNo' => $r->return_no,
            'orderNo' => $r->order?->order_no,
            'typeCode' => $r->type_code,
            'reason' => $r->reason,
            'amount' => (float) $r->amount,
            'status' => $r->status,
            'timeline' => $r->status_timeline ?: [],
            'handleNote' => $r->handle_note,
            'createdAt' => $r->created_at?->toDateTimeString(),
        ];
    }
}
