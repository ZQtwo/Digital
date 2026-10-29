<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BannerController extends BaseController
{
    /** GET /admin/banners 轮播图列表（全部，含停用） */
    public function index(): JsonResponse
    {
        $list = Banner::orderByDesc('weight')->orderBy('id')->get()->map(fn ($b) => $this->row($b))->all();
        return $this->ok(['list' => $list]);
    }

    /** POST /admin/banners 新增轮播图 */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'position' => 'required|in:home_top,side,activity',
            'title' => 'required|string|max:128',
            'image' => 'required|string|max:512',
            'link' => 'nullable|string|max:512',
            'weight' => 'nullable|integer',
            'enabled' => 'nullable|boolean',
            'startAt' => 'nullable|date',
            'endAt' => 'nullable|date|after_or_equal:startAt',
        ]);

        $banner = Banner::create([
            'position' => $data['position'],
            'title' => $data['title'],
            'image_url' => $data['image'],
            'link_url' => $data['link'] ?? null,
            'weight' => $data['weight'] ?? 0,
            'enabled' => (int) ($data['enabled'] ?? true),
            'start_at' => $data['startAt'] ?? null,
            'end_at' => $data['endAt'] ?? null,
            'created_by' => $request->user()?->admin_code,
        ]);

        return $this->ok(['id' => $banner->id], '轮播图已创建');
    }

    /** PUT /admin/banners/{id} 更新轮播图 */
    public function update(Request $request, int $id): JsonResponse
    {
        $banner = Banner::find($id);
        if (!$banner) {
            return $this->fail('轮播图不存在', 404);
        }

        $data = $this->validate($request, [
            'position' => 'sometimes|required|in:home_top,side,activity',
            'title' => 'sometimes|required|string|max:128',
            'image' => 'sometimes|required|string|max:512',
            'link' => 'nullable|string|max:512',
            'weight' => 'nullable|integer',
            'enabled' => 'nullable|boolean',
            'startAt' => 'nullable|date',
            'endAt' => 'nullable|date|after_or_equal:startAt',
        ]);

        $map = ['image' => 'image_url', 'link' => 'link_url', 'weight' => 'weight',
            'enabled' => 'enabled', 'startAt' => 'start_at', 'endAt' => 'end_at'];
        $banner->fill(collect($data)->filter(fn ($v) => $v !== null)
            ->mapWithKeys(fn ($v, $k) => [$map[$k] ?? \Illuminate\Support\Str::snake($k) => $v])->all());
        $banner->save();

        return $this->ok(null, '轮播图已更新');
    }

    /** DELETE /admin/banners/{id} 删除轮播图 */
    public function destroy(int $id): JsonResponse
    {
        $banner = Banner::find($id);
        if (!$banner) {
            return $this->fail('轮播图不存在', 404);
        }

        $banner->delete();
        return $this->ok(null, '轮播图已删除');
    }

    protected function row(Banner $b): array
    {
        return [
            'id' => $b->id,
            'position' => $b->position,
            'title' => $b->title,
            'image' => $b->image_url,
            'link' => $b->link_url,
            'weight' => $b->weight,
            'enabled' => (bool) $b->enabled,
            'startAt' => $b->start_at?->toDateTimeString(),
            'endAt' => $b->end_at?->toDateTimeString(),
            'createdBy' => $b->created_by,
            'updatedAt' => $b->updated_at?->toDateTimeString(),
        ];
    }
}
