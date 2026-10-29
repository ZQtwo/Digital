<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\CouponTemplate;
use App\Models\UserCoupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CouponController extends BaseController
{
    /** GET /coupons/templates 可领取的优惠券模板 */
    public function templates(): JsonResponse
    {
        $now = now();
        $list = CouponTemplate::where('status', 1)
            ->where(fn ($q) => $q->whereNull('remaining')->orWhere('remaining', '>', 0))
            ->orderBy('id')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'code' => $t->coupon_code,
                'title' => $t->title,
                'amount' => (float) $t->amount,
                'threshold' => (float) $t->threshold,
                'validDays' => $t->valid_days,
                'scope' => $t->scope,
                'description' => $t->description,
                'remaining' => $t->remaining,
                'perLimit' => $t->per_limit,
            ])->all();

        return $this->ok(['list' => $list]);
    }

    /** POST /coupons/claim {templateId} 领取优惠券（限领+库存校验） */
    public function claim(Request $request): JsonResponse
    {
        $data = $this->validate($request, ['templateId' => 'required|integer']);
        $member = $request->user();

        $template = CouponTemplate::where('id', $data['templateId'])->where('status', 1)->first();
        if (!$template) {
            return $this->fail('优惠券不存在或已停用', 404);
        }
        if ($template->remaining !== null && $template->remaining <= 0) {
            return $this->fail('该优惠券已抢完');
        }

        $owned = UserCoupon::where('member_id', $member->id)
            ->where('template_id', $template->id)
            ->where('used', 0)
            ->where('expire_at', '>', now())
            ->count();
        if ($owned >= $template->per_limit) {
            return $this->fail('已达到该券的领取上限');
        }

        $coupon = DB::transaction(function () use ($template, $member) {
            if ($template->remaining !== null) {
                $affected = CouponTemplate::where('id', $template->id)
                    ->where('remaining', '>', 0)
                    ->decrement('remaining');
                if (!$affected) {
                    return null;
                }
            }

            return UserCoupon::create([
                'member_id' => $member->id,
                'template_id' => $template->id,
                'title' => $template->title,
                'amount' => $template->amount,
                'threshold' => $template->threshold,
                'scope' => $template->scope,
                'used' => 0,
                'claimed_at' => now(),
                'expire_at' => now()->addDays($template->valid_days),
            ]);
        });

        if (!$coupon) {
            return $this->fail('该优惠券已抢完');
        }

        return $this->ok(['id' => $coupon->id, 'title' => $coupon->title], '领取成功');
    }

    /** GET /coupons?used=0 我的优惠券（used: 0未用 1已用） */
    public function index(Request $request): JsonResponse
    {
        $member = $request->user();

        $q = UserCoupon::where('member_id', $member->id);
        if (($used = $request->query('used')) !== null && $used !== '') {
            $q->where('used', (int) $used);
        }

        $list = $q->orderByDesc('id')->get()->map(fn ($c) => [
            'id' => $c->id,
            'templateId' => $c->template_id,
            'title' => $c->title,
            'amount' => (float) $c->amount,
            'threshold' => (float) $c->threshold,
            'scope' => $c->scope,
            'used' => (bool) $c->used,
            'claimedAt' => $c->claimed_at?->toDateTimeString(),
            'expireAt' => $c->expire_at?->toDateTimeString(),
            'usable' => $c->isUsable(),
        ])->all();

        return $this->ok(['list' => $list]);
    }

    /** GET /coupons/available?amount=6499&productId=&categoryId= 当前金额可用的优惠券（结算用） */
    public function available(Request $request): JsonResponse
    {
        $amount = (float) $request->query('amount', 0);
        $productId = $request->query('productId');
        $categoryId = $request->query('categoryId');

        $list = UserCoupon::where('member_id', $request->user()->id)
            ->where('used', 0)
            ->where('expire_at', '>', now())
            ->where('threshold', '<=', $amount)
            ->orderByDesc('amount')
            ->get()
            // 按 scope 过滤：only all 或匹配当前商品/分类的券才算"可用"
            ->filter(function ($c) use ($productId, $categoryId) {
                $scope = $c->scope;
                if (empty($scope) || $scope === 'all') {
                    return true;
                }
                // scope 从 UserCoupon 取，但 scope_value 在 CouponTemplate
                // 简化处理：如果没传 productId/categoryId（如结算页尚未选中商品），只返回 all 券
                if ($scope === 'product') {
                    return $productId !== null;
                }
                if ($scope === 'category') {
                    return $categoryId !== null;
                }
                return true;
            })
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->title,
                'amount' => (float) $c->amount,
                'threshold' => (float) $c->threshold,
                'scope' => $c->scope,
                'expireAt' => $c->expire_at?->toDateTimeString(),
            ])->all();

        return $this->ok(['list' => $list]);
    }
}
