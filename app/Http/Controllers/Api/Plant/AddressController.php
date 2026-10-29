<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends BaseController
{
    /** GET /addresses 我的地址列表 */
    public function index(Request $request): JsonResponse
    {
        return $this->ok(['list' => $this->listData($request)]);
    }

    /** POST /addresses 新增地址 */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'receiverName' => 'required|string|max:64',
            'phone' => 'required|string|max:20',
            'province' => 'required|string|max:64',
            'city' => 'required|string|max:64',
            'district' => 'required|string|max:64',
            'detail' => 'required|string|max:256',
            'isDefault' => 'nullable|boolean',
        ]);

        $member = $request->user();

        $address = DB::transaction(function () use ($data, $member) {
            $isDefault = (bool) ($data['isDefault'] ?? false);
            // 首个地址自动设为默认
            if (!$isDefault && $member->addresses()->count() === 0) {
                $isDefault = true;
            }
            if ($isDefault) {
                $member->addresses()->update(['is_default' => 0]);
            }
            return Address::create([
                'member_id' => $member->id,
                'receiver_name' => $data['receiverName'],
                'phone' => $data['phone'],
                'province' => $data['province'],
                'city' => $data['city'],
                'district' => $data['district'],
                'detail' => $data['detail'],
                'is_default' => $isDefault ? 1 : 0,
            ]);
        });

        return $this->ok(['id' => $address->id], '地址已保存');
    }

    /** PUT /addresses/{id} 更新地址 */
    public function update(Request $request, int $id): JsonResponse
    {
        $address = $this->findOwned($request, $id);
        if (!$address) {
            return $this->fail('地址不存在', 404);
        }

        $data = $this->validate($request, [
            'receiverName' => 'sometimes|required|string|max:64',
            'phone' => 'sometimes|required|string|max:20',
            'province' => 'sometimes|required|string|max:64',
            'city' => 'sometimes|required|string|max:64',
            'district' => 'sometimes|required|string|max:64',
            'detail' => 'sometimes|required|string|max:256',
            'isDefault' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($data, $request, $address) {
            // 只在 isDefault 明确为 true 时切换默认地址
            // 传 false 或不传 → 不修改 is_default 字段（避免出现无默认地址的状态）
            $snake = collect($data)->mapWithKeys(fn ($v, $k) => [
                \Illuminate\Support\Str::snake($k) => $v,
            ])->all();
            if (!empty($data['isDefault'])) {
                $request->user()->addresses()->where('id', '!=', $address->id)
                    ->update(['is_default' => 0]);
                $snake['is_default'] = 1;
            } else {
                unset($snake['is_default']);
            }
            // Query Builder 直写（避免模型实例状态导致的静默不生效）
            Address::where('id', $address->id)->update($snake);
        });

        return $this->ok(null, '地址已更新');
    }

    /** DELETE /addresses/{id} 删除地址 */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $address = $this->findOwned($request, $id);
        if (!$address) {
            return $this->fail('地址不存在', 404);
        }

        $wasDefault = $address->is_default;
        $address->delete();

        // 删除默认地址后自动补位
        if ($wasDefault) {
            $next = $request->user()->addresses()->orderByDesc('is_default')->orderBy('id')->first();
            if ($next) {
                Address::where('id', $next->id)->update(['is_default' => 1]);
            }
        }

        return $this->ok(null, '地址已删除');
    }

    /** PUT /addresses/{id}/default 设为默认地址 */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        $address = $this->findOwned($request, $id);
        if (!$address) {
            return $this->fail('地址不存在', 404);
        }

        DB::transaction(function () use ($request, $address) {
            $memberId = $request->user()->id;
            // 先清默认，再用 Query Builder 直写目标行（不依赖模型实例状态）
            Address::where('member_id', $memberId)->update(['is_default' => 0]);
            Address::where('id', $address->id)->where('member_id', $memberId)->update(['is_default' => 1]);
        });

        return $this->ok(null, '已设为默认地址');
    }

    protected function listData(Request $request): array
    {
        return $request->user()->addresses()
            ->orderByDesc('is_default')->orderBy('id')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'name' => $a->receiver_name,        // 前端卡片兼容字段
                'receiverName' => $a->receiver_name,
                'phone' => $a->phone,
                'province' => $a->province,
                'city' => $a->city,
                'district' => $a->district,
                'region' => $a->fullRegion(),
                'detail' => $a->detail,
                'isDefault' => (bool) $a->is_default,
            ])->all();
    }

    protected function findOwned(Request $request, int $id): ?Address
    {
        return Address::where('id', $id)->where('member_id', $request->user()->id)->first();
    }
}
