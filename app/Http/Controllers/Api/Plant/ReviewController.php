<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends BaseController
{
    /** POST /reviews 提交评价（仅已完成订单；回填明细与商品评分） */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'orderNo' => 'required|string',
            'orderItemId' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'content' => 'nullable|string|max:1000',
            'anonymous' => 'nullable|boolean',
        ]);

        $member = $request->user();

        $order = Order::where('order_no', $data['orderNo'])
            ->where('member_id', $member->id)
            ->first();

        if (!$order) {
            return $this->fail('订单不存在', 404);
        }
        if ($order->status !== 'completed') {
            return $this->fail('仅已完成订单可以评价');
        }

        $item = OrderItem::where('id', $data['orderItemId'])
            ->where('order_id', $order->id)
            ->first();

        if (!$item) {
            return $this->fail('订单明细不存在', 404);
        }
        if ($item->comment_id) {
            return $this->fail('该商品已评价过');
        }

        $review = DB::transaction(function () use ($data, $order, $item, $member) {
            $review = Review::create([
                'product_id' => $item->product_id,
                'member_id' => $member->id,
                'order_id' => $order->id,
                'order_item_id' => $item->id,
                'rating' => $data['rating'],
                'content' => trim((string) ($data['content'] ?? '')),
                'tag' => '真实购买',
                'anonymous' => (bool) ($data['anonymous'] ?? false),
                'nickname_snapshot' => $member->name,
                'status' => 1,
            ]);

            // 回填订单明细
            $item->forceFill(['comment_id' => $review->id])->save();

            // 重算商品评分
            $agg = Review::where('product_id', $item->product_id)
                ->where('status', 1)
                ->selectRaw('COUNT(*) AS n, AVG(rating) AS avg_rating')
                ->first();
            Product::where('id', $item->product_id)->update([
                'rating_count' => (int) $agg->n,
                'rating' => round((float) $agg->avg_rating, 1),
            ]);

            return $review;
        });

        return $this->ok([
            'id' => $review->id,
            'rating' => $review->rating,
        ], '评价成功');
    }
}
