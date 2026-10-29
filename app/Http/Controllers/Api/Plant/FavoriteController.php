<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteController extends BaseController
{
    /** GET /favorites 收藏列表（带商品卡片信息） */
    public function index(Request $request): JsonResponse
    {
        $member = $request->user();

        $list = Favorite::with(['product.brand:id,name', 'product.category:id,code,name'])
            ->where('member_id', $member->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($f) => $f->product ? HomeController::productCard($f->product) + ['favoredAt' => $f->created_at?->toDateTimeString()] : null)
            ->filter()
            ->values();

        return $this->ok(['list' => $list]);
    }

    /** GET /favorites/ids 收藏商品ID集合（角标/状态标记） */
    public function ids(Request $request): JsonResponse
    {
        $ids = $request->user()->favorites()->pluck('product_id');
        return $this->ok(['ids' => $ids, 'count' => $ids->count()]);
    }

    /** POST /favorites/toggle {productId} 收藏/取消收藏（幂等切换） */
    public function toggle(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'productId' => 'required|integer',
        ]);

        if (!Product::where('id', $data['productId'])->exists()) {
            return $this->fail('商品不存在', 404);
        }

        $member = $request->user();
        $exists = Favorite::where('member_id', $member->id)
            ->where('product_id', $data['productId'])
            ->first();

        if ($exists) {
            $exists->delete();
            $favored = false;
        } else {
            Favorite::create([
                'member_id' => $member->id,
                'product_id' => $data['productId'],
                'created_at' => now(),
            ]);
            $favored = true;
        }

        return $this->ok([
            'favored' => $favored,
            'count' => $member->favorites()->count(),
        ], $favored ? '已收藏' : '已取消收藏');
    }
}
