<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\OrderFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends BaseController
{
    /**
     * GET /feedbacks 我的反馈列表（分页）
     */
    public function index(Request $request): JsonResponse
    {
        $member = $request->user();
        $pageSize = $this->pageSize($request, 10);

        $query = OrderFeedback::where('member_id', $member->id)
            ->orderByDesc('id');

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $paginator = $query->paginate($pageSize);

        return $this->ok($this->paginate($paginator, fn ($f) => $this->format($f)));
    }

    /**
     * GET /feedbacks/{id} 单条详情
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $feedback = OrderFeedback::where('id', $id)
            ->where('member_id', $request->user()->id)
            ->first();

        if (!$feedback) {
            return $this->fail('反馈不存在', 404);
        }

        return $this->ok($this->format($feedback));
    }

    /**
     * POST /feedbacks 提交新反馈
     * {type, subject, content, contact?, orderId?, orderNo?}
     */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'type' => ['required', 'in:' . implode(',', OrderFeedback::TYPES)],
            'subject' => 'required|string|max:200',
            'content' => 'required|string|max:2000',
            'contact' => 'nullable|string|max:50',
            'orderId' => 'nullable|integer',
            'orderNo' => 'nullable|string|max:32',
        ]);

        $member = $request->user();

        $feedback = OrderFeedback::create([
            'member_id' => $member->id,
            'order_id' => $data['orderId'] ?? null,
            'order_no' => $data['orderNo'] ?? null,
            'type' => $data['type'],
            'subject' => $data['subject'],
            'content' => $data['content'],
            'contact' => $data['contact'] ?? null,
            'status' => 'pending',
        ]);

        return $this->ok($this->format($feedback), '反馈已提交');
    }

    /** 把 OrderFeedback 转成前端友好的数组 */
    protected function format(OrderFeedback $f): array
    {
        return [
            'id' => $f->id,
            'orderId' => $f->order_id,
            'orderNo' => $f->order_no,
            'type' => $f->type,
            'subject' => $f->subject,
            'content' => $f->content,
            'contact' => $f->contact,
            'status' => $f->status,
            'adminReply' => $f->admin_reply,
            'repliedAt' => $f->replied_at?->toDateTimeString(),
            'createdAt' => $f->created_at?->toDateTimeString(),
        ];
    }
}
