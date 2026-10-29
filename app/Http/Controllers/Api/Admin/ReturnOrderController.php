<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Order;
use App\Models\ReturnOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReturnOrderController extends BaseController
{
    /** GET /admin/returns?status=&keyword=&page=&pageSize= 退换货单列表 */
    public function index(Request $request): JsonResponse
    {
        $q = ReturnOrder::with(['order:id,order_no,status,pay_amount', 'member:id,name,phone']);

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('return_no', 'like', "%{$kw}%")
                  ->orWhereHas('order', fn ($o) => $o->where('order_no', 'like', "%{$kw}%"));
            });
        }

        $page = $this->paginate($q->orderByDesc('id')->paginate($this->pageSize($request)), fn ($r) => $this->row($r));

        return $this->ok($page);
    }

    /** GET /admin/returns/{id} 退换货单详情 */
    public function show(int $id): JsonResponse
    {
        $r = ReturnOrder::with(['order:id,order_no,status,pay_amount', 'member:id,name,phone'])->find($id);
        if (!$r) {
            return $this->fail('退换货单不存在', 404);
        }

        $data = $this->row($r);
        $data['order'] = $r->order ? [
            'orderNo' => $r->order->order_no,
            'statusLabel' => Order::STATUS_LABELS[$r->order->status] ?? $r->order->status,
            'payAmount' => (float) $r->order->pay_amount,
        ] : null;

        return $this->ok($data);
    }

    /** PUT /admin/returns/{id}/handle 退换货审核处理（approve/reject/complete） */
    public function handle(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|in:approve,reject,complete',
            'note' => 'nullable|string|max:256',
        ]);

        $r = ReturnOrder::find($id);
        if (!$r) {
            return $this->fail('退换货单不存在', 404);
        }

        $map = ['approve' => 'approved', 'reject' => 'rejected', 'complete' => 'completed'];
        $target = $map[$data['action']];

        if (!in_array($target, ReturnOrder::TRANSITIONS[$r->status] ?? [], true)) {
            return $this->fail("当前状态「{$r->status}」不允许该操作");
        }

        $labels = ['approved' => '已同意', 'rejected' => '已拒绝', 'completed' => '已完成'];

        $timeline = $r->status_timeline ?? [];
        $timeline[] = [
            'status' => $target,
            'label' => $labels[$target],
            'at' => now()->toDateTimeString(),
        ];

        $r->status = $target;
        $r->handle_note = $data['note'] ?? null;
        $r->operator = $request->user()?->admin_code;
        $r->status_timeline = $timeline;
        $r->save();

        return $this->ok(null, '处理成功');
    }

    /** 列表行结构 */
    protected function row(ReturnOrder $r): array
    {
        return [
            'id' => $r->id,
            'returnNo' => $r->return_no,
            'orderNo' => $r->order?->order_no,
            'memberId' => $r->member_id,
            'memberName' => $r->member?->name,
            'typeCode' => $r->type_code,
            'reason' => $r->reason,
            'amount' => (float) $r->amount,
            'status' => $r->status,
            'handleNote' => $r->handle_note,
            'operator' => $r->operator,
            'timeline' => $r->status_timeline ?? [],
            'createdAt' => $r->created_at?->toDateTimeString(),
        ];
    }
}
