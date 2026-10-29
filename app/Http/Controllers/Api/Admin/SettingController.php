<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Admin;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SettingController extends BaseController
{
    /** GET /admin/settings 系统设置详情（含最后设置操作人，绑定管理员数据表） */
    public function show(): JsonResponse
    {
        $data = $this->data(Setting::current());
        $data += $this->lastSettingInfo();
        return $this->ok($data);
    }

    /** PUT /admin/settings 保存系统设置（【需求14】保存后把操作记录写入当前登录管理员的记录） */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'siteName' => 'sometimes|string|max:64',
            'siteSubtitle' => 'nullable|string|max:128',
            'defaultTheme' => 'sometimes|in:dark,light',
            'dateFormat' => 'sometimes|string|max:16',
            'currency' => 'sometimes|string|max:8',
            'orderNotify' => 'sometimes|boolean',
            'alertThreshold' => 'sometimes|integer|min:0',
            'copyright' => 'nullable|string|max:128',
        ]);

        $setting = Setting::current();
        $setting->fill(collect($data)->mapWithKeys(fn ($v, $k) => [Str::snake($k) => $v])->all());
        $setting->save();

        // 【需求14】把本次设置操作记录到管理员数据表（ssc_guanliyuan），绑定当前登录管理员
        /** @var Admin $admin */
        $admin = $request->user();
        $admin->forceFill([
            'last_setting_action' => '保存系统设置：' . implode('、', array_keys($data)),
            'last_setting_at' => now(),
        ])->save();

        $out = $this->data($setting);
        $out += $this->lastSettingInfo();
        return $this->ok($out);
    }

    /** 最后一次设置操作（来自当前管理员数据表记录） */
    protected function lastSettingInfo(): array
    {
        /** @var Admin|null $admin */
        $admin = request()->user();
        if (!$admin) {
            return ['lastSettingBy' => null, 'lastSettingAction' => null, 'lastSettingAt' => null];
        }
        return [
            'lastSettingBy' => $admin->realname ?: $admin->nickname ?: $admin->username,
            'lastSettingAction' => $admin->last_setting_action,
            'lastSettingAt' => $admin->last_setting_at ? \Carbon\Carbon::parse($admin->last_setting_at)->format('Y-m-d H:i:s') : null,
        ];
    }

    /** 设置行输出结构 */
    protected function data(Setting $s): array
    {
        return [
            'siteName' => $s->site_name,
            'siteSubtitle' => $s->site_subtitle,
            'defaultTheme' => $s->default_theme,
            'dateFormat' => $s->date_format,
            'currency' => $s->currency,
            'orderNotify' => (bool) $s->order_notify,
            'alertThreshold' => (int) $s->alert_threshold,
            'copyright' => $s->copyright,
            'updatedAt' => $s->updated_at?->toDateTimeString(),
        ];
    }
}
