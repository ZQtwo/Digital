<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminAccountController extends BaseController
{
    /** 【需求16】手机号格式：1 开头第二位 3-9 共 11 位数字 */
    private const PHONE_RULE = 'regex:/^1[3-9]\d{9}$/';

    /**
     * 【需求15】密码复杂度：6~20 个字符，必须同时包含
     * 小写字母、大写字母、数字、特殊符号（如 Zxy@13182796613 = 15 个字符）
     */
    private const PASSWORD_RULE = 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/';

    private const PASSWORD_MSGS = [
        'password.regex' => '密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号',
        'newPassword.regex' => '密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号',
        'phone.regex' => '手机号格式不正确',
    ];

    /** GET /admin/admins 管理员列表（绑定管理员数据表 ssc_guanliyuan） */
    public function index(): JsonResponse
    {
        $list = Admin::orderBy('id')->get()->map(fn ($a) => $this->row($a))->all();
        return $this->ok(['list' => $list]);
    }

    /** POST /admin/admins 新增管理员（仅超管；【需求15/16】手机号必填 + 密码复杂度） */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'username' => 'required|string|max:64|unique:ssc_guanliyuan,username',
            'password' => ['required', 'string', self::PASSWORD_RULE],
            'realname' => 'nullable|string|max:64',
            'phone' => ['required', 'string', self::PHONE_RULE],
            'email' => 'nullable|email|max:128',
            'role' => 'required|in:super,admin',
        ], self::PASSWORD_MSGS);

        $admin = DB::transaction(function () use ($data) {
            $maxId = (int) Admin::max('id');
            return Admin::create([
                'admin_code' => 'adm' . ($maxId + 1),
                'username' => $data['username'],
                'password_hash' => Hash::make($data['password']),
                'realname' => $data['realname'] ?? $data['username'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'role_code' => $data['role'],
                // 数据库 status 为 tinyint(1)：1=启用 0=禁用（API 层仍用 active/disabled）
                'status' => 1,
            ]);
        });

        return $this->ok(['id' => $admin->id], '管理员已创建');
    }

    /** PUT /admin/admins/{id} 编辑管理员 */
    public function update(Request $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (!$admin) {
            return $this->fail('管理员不存在', 404);
        }

        $data = $this->validate($request, [
            'realname' => 'nullable|string|max:64',
            'phone' => ['nullable', 'string', self::PHONE_RULE],
            'email' => 'nullable|email|max:128',
            'role' => 'nullable|in:super,admin',
        ], self::PASSWORD_MSGS);

        $fill = collect($data)->filter(fn ($v) => $v !== null)->mapWithKeys(fn ($v, $k) => [
            ['role' => 'role_code'][$k] ?? \Illuminate\Support\Str::snake($k) => $v,
        ])->all();

        // 不允许降级最后一个超级管理员（DB status tinyint：1=启用）
        if (isset($fill['role_code']) && $admin->isSuper() && $fill['role_code'] !== 'super'
            && Admin::where('role_code', 'super')->where('status', 1)->count() <= 1) {
            return $this->fail('系统至少保留一名超级管理员');
        }

        $admin->fill($fill);
        $admin->save();

        return $this->ok(null, '管理员已更新');
    }

    /** PUT /admin/admins/{id}/status {status} 启用/禁用 */
    public function setStatus(Request $request, int $id): JsonResponse
    {
        $data = $this->validate($request, ['status' => 'required|in:active,disabled']);
        $admin = Admin::find($id);
        if (!$admin) {
            return $this->fail('管理员不存在', 404);
        }
        if ($admin->id === $request->user()->id) {
            return $this->fail('不能修改自己的状态');
        }
        if ($admin->isSuper() && $data['status'] === 'disabled'
            && Admin::where('role_code', 'super')->where('status', 1)->where('id', '!=', $admin->id)->count() === 0) {
            return $this->fail('系统至少保留一名启用的超级管理员');
        }

        // DB status 为 tinyint(1)：1=启用 0=禁用
        $admin->forceFill(['status' => $data['status'] === 'active' ? 1 : 0])->save();

        // 禁用时注销其所有 token
        if ($data['status'] === 'disabled') {
            $admin->tokens()->delete();
        }

        return $this->ok(null, $data['status'] === 'active' ? '已启用' : '已禁用');
    }

    /** PUT /admin/admins/{id}/reset-password {newPassword} 重置密码（【需求15】复杂度校验） */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $data = $this->validate($request, ['newPassword' => ['required', 'string', self::PASSWORD_RULE]], self::PASSWORD_MSGS);
        $admin = Admin::find($id);
        if (!$admin) {
            return $this->fail('管理员不存在', 404);
        }

        $admin->forceFill(['password_hash' => Hash::make($data['newPassword'])])->save();

        return $this->ok(null, '密码已重置');
    }

    /** DELETE /admin/admins/{id} 删除管理员 */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $admin = Admin::find($id);
        if (!$admin) {
            return $this->fail('管理员不存在', 404);
        }
        if ($admin->id === $request->user()->id) {
            return $this->fail('不能删除自己');
        }
        if ($admin->isSuper() && Admin::where('role_code', 'super')->where('status', 1)->count() <= 1) {
            return $this->fail('系统至少保留一名启用的超级管理员');
        }

        $admin->tokens()->delete();
        $admin->delete();

        return $this->ok(null, '管理员已删除');
    }

    protected function row(Admin $a): array
    {
        return [
            'id' => $a->id,
            'adminCode' => $a->admin_code,
            'username' => $a->username,
            'realname' => $a->realname,
            'phone' => $a->phone,
            // 归一化：DB 中可能存有字面量 'NULL' 字符串，统一转 null
            'email' => ($a->email && strcasecmp((string) $a->email, 'NULL') !== 0) ? $a->email : null,
            'role' => $a->role_code,
            // DB status tinyint(1) → API 契约 active/disabled
            'status' => ((int) $a->status === 1) ? 'active' : 'disabled',
            'lastLoginAt' => $a->last_login_at?->toDateTimeString(),
            'loginCount' => $a->login_count,
            'createdAt' => $a->created_at?->toDateTimeString(),
        ];
    }
}
