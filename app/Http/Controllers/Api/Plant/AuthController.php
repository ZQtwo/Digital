<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends BaseController
{
    /** POST /auth/register 会员注册 */
    public function register(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'name' => 'required|string|max:64',
            'phone' => ['required', 'string', 'max:20', 'regex:/^1[3-9]\d{9}$/'],
            'password' => 'required|string|min:6|max:32',
        ]);

        if (Member::where('phone', $data['phone'])->exists()) {
            return $this->fail('该手机号已注册');
        }

        $member = DB::transaction(function () use ($data) {
            $maxId = (int) Member::max('id');
            return Member::create([
                'member_code' => 'mbr' . ($maxId + 1),
                'name' => $data['name'],
                'phone' => $data['phone'],
                'password_hash' => Hash::make($data['password']),
                'level_code' => 'normal',
                'status' => 'normal',
                'register_type' => 'self',
                'channel' => 'H5',
                'verified_phone' => 0,
                'password_set' => 1,
                'last_active_at' => now(),
            ]);
        });

        $token = $member->createToken('member', ['member'])->plainTextToken;

        return $this->ok([
            'token' => $token,
            'member' => $this->memberBrief($member),
        ], '注册成功');
    }

    /** POST /auth/login 会员登录（手机号+密码） */
    public function login(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'phone' => 'required|string|max:20',
            'password' => 'required|string|max:32',
        ]);

        $member = Member::where('phone', $data['phone'])->first();
        if (!$member) {
            return $this->fail('该用户不存在', 404);
        }
        if (!$this->verifyPassword($data['password'], (string) $member->password_hash)) {
            return $this->fail('密码错误', 401);
        }
        if (in_array($member->status, ['frozen', 'blacklist'], true)) {
            return $this->fail('账号已被限制登录，请联系客服', 403);
        }

        $member->forceFill(['last_active_at' => now()])->save();
        $token = $member->createToken('member', ['member'])->plainTextToken;

        return $this->ok([
            'token' => $token,
            'member' => $this->memberBrief($member),
        ], '登录成功');
    }

    /** POST /auth/logout 退出登录（作废当前 token） */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return $this->ok(null, '已退出登录');
    }

    /** GET /auth/me 当前会员信息与计数汇总 */
    public function me(Request $request): JsonResponse
    {
        $member = $request->user();

        $orderStats = DB::table('ssc_dingdan')
            ->where('member_id', $member->id)
            ->selectRaw("status, COUNT(*) AS n")
            ->groupBy('status')
            ->pluck('n', 'status');

        return $this->ok([
            'member' => $this->memberBrief($member),
            'stats' => [
                'favoriteCount' => $member->favorites()->count(),
                'couponCount' => $member->userCoupons()->count(),
                'orderCount' => (int) array_sum($orderStats->all()),
                'pendingPayCount' => (int) ($orderStats['pending_pay'] ?? 0),
                'pendingShipCount' => (int) ($orderStats['pending_ship'] ?? 0),
                'shippedCount' => (int) ($orderStats['shipped'] ?? 0),
                'completedCount' => (int) ($orderStats['completed'] ?? 0),
            ],
        ]);
    }

    /** 会员简要信息（前台展示用） */
    protected function memberBrief(Member $member): array
    {
        return [
            'id' => $member->id,
            'memberCode' => $member->member_code,
            'name' => $member->name,
            'phone' => $member->phone,
            'levelCode' => $member->level_code,
            'levelOverride' => $member->level_override,
            'level' => $member->getEffectiveLevel(),
            'totalSpent' => (float) $member->total_spent,
            'orderCount' => $member->order_count,
            'balance' => (float) $member->balance,
            'points' => $member->points,
            'status' => $member->status,
            'createdAt' => $member->created_at?->toDateTimeString(),
        ];
    }
}
