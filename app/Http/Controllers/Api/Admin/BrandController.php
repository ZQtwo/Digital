<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrandController extends BaseController
{
    /** GET /admin/brands 品牌列表（含商品数） */
    public function index(): JsonResponse
    {
        $counts = \App\Models\Product::selectRaw('brand_id, COUNT(*) AS n')
            ->groupBy('brand_id')->pluck('n', 'brand_id');

        $list = Brand::orderBy('sort_order')->orderBy('id')->get()->map(fn ($b) => [
            'id' => $b->id,
            'code' => $b->code,
            'name' => $b->name,
            'logo' => $b->logo_url,
            'sortOrder' => $b->sort_order,
            'status' => (bool) $b->status,
            'productCount' => (int) ($counts[$b->id] ?? 0),
        ])->all();

        return $this->ok(['list' => $list]);
    }

    /** POST /admin/brands 新增品牌 */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'code' => 'required|string|max:32|unique:ssc_pinpai,code',
            'name' => 'required|string|max:64',
            'logo' => 'nullable|string|max:512',
            'sortOrder' => 'nullable|integer',
            'status' => 'nullable|boolean',
        ]);

        $brand = Brand::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'logo_url' => $data['logo'] ?? null,
            'sort_order' => $data['sortOrder'] ?? 0,
            'status' => (int) ($data['status'] ?? 1),
        ]);

        return $this->ok(['id' => $brand->id], '品牌已创建');
    }

    /** PUT /admin/brands/{id} 更新品牌 */
    public function update(Request $request, int $id): JsonResponse
    {
        $brand = Brand::find($id);
        if (!$brand) {
            return $this->fail('品牌不存在', 404);
        }

        $data = $this->validate($request, [
            'name' => 'sometimes|required|string|max:64',
            'logo' => 'nullable|string|max:512',
            'sortOrder' => 'nullable|integer',
            'status' => 'nullable|boolean',
        ]);

        $map = ['logo' => 'logo_url', 'sortOrder' => 'sort_order'];
        $brand->fill(collect($data)->filter(fn ($v) => $v !== null)->mapWithKeys(fn ($v, $k) => [
            $map[$k] ?? \Illuminate\Support\Str::snake($k) => $v,
        ])->all());
        $brand->save();

        return $this->ok(null, '品牌已更新');
    }

    /** DELETE /admin/brands/{id} 删除品牌（有商品时拒绝） */
    public function destroy(int $id): JsonResponse
    {
        $brand = Brand::find($id);
        if (!$brand) {
            return $this->fail('品牌不存在', 404);
        }
        if ($brand->products()->exists()) {
            return $this->fail('该品牌下存在商品，无法删除');
        }

        $brand->delete();
        return $this->ok(null, '品牌已删除');
    }
}
