<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Member;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MemberController extends BaseController
{
    /** GET /admin/members?keyword=&level=&status=&page=&pageSize= 会员列表 */
    public function index(Request $request): JsonResponse
    {
        $q = Member::query();

        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('name', 'like', "%{$kw}%")
                  ->orWhere('phone', 'like', "%{$kw}%")
                  ->orWhere('member_code', 'like', "%{$kw}%");
            });
        }
        if ($level = $request->query('level')) {
            // 生效等级：手动指定优先
            $q->where(function ($w) use ($level) {
                $w->where('level_override', $level)
                  ->orWhere(function ($x) use ($level) {
                      $x->whereNull('level_override')->where('level_code', $level);
                  });
            });
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }

        $page = $this->paginate($q->orderBy('id')->paginate($this->pageSize($request)), function ($m) {
            return $this->row($m);
        });

        $page['stats'] = [
            'total' => Member::count(),
            'normal' => Member::where('status', 'normal')->count(),
            'frozen' => Member::where('status', 'frozen')->count(),
            'blacklist' => Member::where('status', 'blacklist')->count(),
            'levelCounts' => [
                'normal' => Member::where(fn ($w) => $w->where('level_override', 'normal')->orWhere(fn ($x) => $x->whereNull('level_override')->where('level_code', 'normal')))->count(),
                'silver' => Member::where(fn ($w) => $w->where('level_override', 'silver')->orWhere(fn ($x) => $x->whereNull('level_override')->where('level_code', 'silver')))->count(),
                'gold' => Member::where(fn ($w) => $w->where('level_override', 'gold')->orWhere(fn ($x) => $x->whereNull('level_override')->where('level_code', 'gold')))->count(),
                'platinum' => Member::where(fn ($w) => $w->where('level_override', 'platinum')->orWhere(fn ($x) => $x->whereNull('level_override')->where('level_code', 'platinum')))->count(),
            ],
        ];

        return $this->ok($page);
    }

    /** POST /admin/members 后台创建会员 */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'name' => 'required|string|max:64',
            'phone' => ['required', 'string', 'max:20', 'regex:/^1[3-9]\d{9}$/'],
            'password' => 'required|string|min:6|max:32',
            'levelCode' => 'nullable|in:normal,silver,gold,platinum',
            'balance' => 'nullable|numeric|min:0',
            'points' => 'nullable|integer|min:0',
        ]);

        if (Member::where('phone', $data['phone'])->exists()) {
            return $this->fail('该手机号已是会员');
        }

        $member = DB::transaction(function () use ($data, $request) {
            $maxId = (int) Member::max('id');
            return Member::create([
                'member_code' => 'mbr' . ($maxId + 1),
                'name' => $data['name'],
                'phone' => $data['phone'],
                'password_hash' => Hash::make($data['password']),
                'level_code' => $data['levelCode'] ?? 'normal',
                'status' => 'normal',
                'balance' => $data['balance'] ?? 0,
                'points' => $data['points'] ?? 0,
                'register_type' => 'admin',
                'created_by' => $request->user()?->admin_code,
                'channel' => 'H5',
                'verified_phone' => 1,
                'password_set' => 1,
            ]);
        });

        return $this->ok(['id' => $member->id], '会员已创建');
    }

    /** GET /admin/members/{id} 会员详情（含订单概览） */
    public function show(int $id): JsonResponse
    {
        $m = Member::find($id);
        if (!$m) {
            return $this->fail('会员不存在', 404);
        }

        $agg = Order::where('member_id', $m->id)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COUNT(*) AS n, COALESCE(SUM(pay_amount),0) AS amount')
            ->first();

        return $this->ok($this->row($m) + [
            'orderCount' => (int) ($agg->n ?? 0),
            'orderAmount' => (float) ($agg->amount ?? 0),
        ]);
    }

    /** PUT /admin/members/{id} 编辑会员（资料/等级/状态/余额/积分） */
    public function update(Request $request, int $id): JsonResponse
    {
        $m = Member::find($id);
        if (!$m) {
            return $this->fail('会员不存在', 404);
        }

        $data = $this->validate($request, [
            'name' => 'sometimes|required|string|max:64',
            'phone' => 'sometimes|required|string|max:20',
            'levelCode' => 'nullable|in:normal,silver,gold,platinum',
            'levelOverride' => 'nullable|in:normal,silver,gold,platinum',
            'status' => 'nullable|in:normal,frozen,blacklist',
            'balance' => 'nullable|numeric|min:0',
            'points' => 'nullable|integer|min:0',
        ]);

        $map = ['levelCode' => 'level_code', 'levelOverride' => 'level_override'];
        $fill = collect($data)->filter(fn ($v) => $v !== null)->mapWithKeys(fn ($v, $k) => [
            $map[$k] ?? \Illuminate\Support\Str::snake($k) => $v,
        ])->all();

        if (isset($fill['phone']) && $fill['phone'] !== $m->phone
            && Member::where('phone', $fill['phone'])->where('id', '!=', $m->id)->exists()) {
            return $this->fail('该手机号已被其他会员使用');
        }

        $m->fill($fill);
        $m->save();

        // 会员状态变更为冻结/拉黑时吊销所有 token，强制下线
        if (isset($fill['status']) && in_array($fill['status'], ['frozen', 'blacklist'], true)) {
            $m->tokens()->delete();
        }

        return $this->ok(null, '会员已更新');
    }

    /** PUT /admin/members/{id}/reset-password {newPassword} 重置密码 */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $data = $this->validate($request, ['newPassword' => 'required|string|min:6|max:32']);
        $m = Member::find($id);
        if (!$m) {
            return $this->fail('会员不存在', 404);
        }

        $m->forceFill(['password_hash' => Hash::make($data['newPassword']), 'password_set' => 1])->save();

        return $this->ok(null, '密码已重置');
    }

    /** DELETE /admin/members/{id} 删除会员（有订单时拒绝） */
    public function destroy(int $id): JsonResponse
    {
        $m = Member::find($id);
        if (!$m) {
            return $this->fail('会员不存在', 404);
        }
        if (Order::where('member_id', $m->id)->exists()) {
            return $this->fail('该会员存在订单记录，建议冻结而非删除');
        }

        $m->delete();
        return $this->ok(null, '会员已删除');
    }

    protected function row(Member $m): array
    {
        return [
            'id' => $m->id,
            'memberCode' => $m->member_code,
            'name' => $m->name,
            'phone' => $m->phone,
            'levelCode' => $m->level_code,
            'levelOverride' => $m->level_override,
            'level' => $m->getEffectiveLevel(),
            'totalSpent' => (float) $m->total_spent,
            'orderCount' => $m->order_count,
            'balance' => (float) $m->balance,
            'points' => $m->points,
            'status' => $m->status,
            'registerType' => $m->register_type,
            'createdAt' => $m->created_at?->toDateTimeString(),
            'lastActiveAt' => $m->last_active_at?->toDateTimeString(),
        ];
    }
}
