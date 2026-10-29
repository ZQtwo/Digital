<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends BaseController
{
    /** PUT /profile 修改个人资料 */
    public function update(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'name' => 'sometimes|required|string|max:64',
            'phone' => 'sometimes|required|string|max:20|regex:/^1[3-9]\d{9}$/',
        ]);

        $member = $request->user();

        if (isset($data['phone']) && $data['phone'] !== $member->phone) {
            if (\App\Models\Member::where('phone', $data['phone'])->where('id', '!=', $member->id)->exists()) {
                return $this->fail('该手机号已被其他账号使用');
            }
        }

        $member->fill(collect($data)->mapWithKeys(fn ($v, $k) => [\Illuminate\Support\Str::snake($k) => $v])->all());
        $member->save();

        return $this->ok([
            'id' => $member->id,
            'name' => $member->name,
            'phone' => $member->phone,
        ], '资料已更新');
    }

    /** PUT /profile/password 修改登录密码 */
    public function password(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'oldPassword' => 'required|string|max:32',
            'newPassword' => 'required|string|min:6|max:32',
        ]);

        $member = $request->user();

        if (!$this->verifyPassword($data['oldPassword'], (string) $member->password_hash)) {
            return $this->fail('原密码不正确');
        }

        $member->forceFill([
            'password_hash' => Hash::make($data['newPassword']),
            'password_set' => 1,
        ])->save();

        // 密码修改后吊销所有 token，强制重新登录
        $member->tokens()->delete();

        return $this->ok(null, '密码修改成功，请重新登录');
    }
}
