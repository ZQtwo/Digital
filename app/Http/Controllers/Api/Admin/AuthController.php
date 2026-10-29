<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends BaseController
{
    /** 【需求16】手机号格式：1 开头第二位 3-9 共 11 位数字 */
    private const PHONE_RULE = 'regex:/^1[3-9]\d{9}$/';

    /**
     * 【需求15】密码复杂度：6~20 个字符，必须同时包含
     * 小写字母、大写字母、数字、特殊符号（如 Zxy@13182796613 = 15 个字符）
     */
    private const PASSWORD_RULE = 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,20}$/';

    /** POST /admin/auth/login 管理员登录（手机号 + 密码） */
    public function login(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'phone' => ['required', 'string', self::PHONE_RULE],
            // 登录只校验长度上限：存量老密码（如 admin123）不符合新复杂度规则，不能被锁死
            'password' => 'required|string|max:20',
        ], [
            'phone.regex' => '手机号格式不正确',
        ]);

        $admin = Admin::where('phone', $data['phone'])->first();
        // 密码去除首尾空白（复制粘贴常见坑），中间空格保留
        if (!$admin || !$this->verifyPassword(trim($data['password']), (string) $admin->password_hash)) {
            return $this->fail('手机号或密码错误', 401);
        }
        if ($admin->status != 1) {
            return $this->fail('账号已被禁用', 403);
        }

        $admin->forceFill([
            'last_login_at' => now(),
            'login_count' => $admin->login_count + 1,
        ])->save();

        $token = $admin->createToken('admin', ['admin'])->plainTextToken;

        return $this->ok([
            'token' => $token,
            'admin' => $this->brief($admin),
        ], '登录成功');
    }

    /** POST /admin/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return $this->ok(null, '已退出登录');
    }

    /** GET /admin/auth/me 当前管理员信息 */
    public function me(Request $request): JsonResponse
    {
        return $this->ok(['admin' => $this->brief($request->user())]);
    }

    /** PUT /admin/auth/profile 修改个人资料（绑定管理员数据表 ssc_guanliyuan） */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'nickname' => 'nullable|string|max:64',
            // 头像为 base64 DataURL（前端压缩至 ≤256KB，编码后约 35 万字符），列类型 mediumtext
            'avatar' => 'nullable|string|max:500000',
            'realname' => 'nullable|string|max:64',
            'gender' => 'nullable|string|in:male,female',
            'department' => 'nullable|string|max:64',
            'position' => 'nullable|string|max:64',
            'phone' => ['nullable', 'string', self::PHONE_RULE],
            'email' => 'nullable|email|max:128',
            'bio' => 'nullable|string|max:500',
        ], [
            'avatar.max' => '头像数据过大，请更换较小的图片后重试',
        ]);

        $admin = $request->user();
        $admin->fill(collect($data)->filter(fn ($v) => $v !== null)->all());
        $admin->save();

        return $this->ok(['admin' => $this->brief($admin)], '资料已更新');
    }

    /** PUT /admin/auth/password 修改自己的密码（【需求15】复杂度校验） */
    public function updatePassword(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'oldPassword' => 'required|string|max:20',
            'newPassword' => ['required', 'string', self::PASSWORD_RULE],
        ], [
            'newPassword.regex' => '密码须为 6~20 个字符，且同时包含大小写字母、数字和特殊符号',
        ]);

        $admin = $request->user();
        if (!$this->verifyPassword($data['oldPassword'], (string) $admin->password_hash)) {
            return $this->fail('原密码不正确');
        }

        $admin->forceFill(['password_hash' => Hash::make($data['newPassword'])])->save();

        return $this->ok(null, '密码修改成功，请重新登录');
    }

    protected function brief(Admin $admin): array
    {
        return [
            'id' => $admin->id,
            'adminCode' => $admin->admin_code,
            'username' => $admin->username,
            'nickname' => $admin->nickname,
            'avatar' => $admin->avatar,
            'realname' => $admin->realname,
            'gender' => $admin->gender,
            'department' => $admin->department,
            'position' => $admin->position,
            'phone' => $admin->phone,
            'email' => $admin->email,
            'bio' => $admin->bio,
            'role' => $admin->role_code,
            'status' => $admin->status,
            'lastLoginAt' => $admin->last_login_at?->toDateTimeString(),
            'loginCount' => $admin->login_count,
        ];
    }
}
