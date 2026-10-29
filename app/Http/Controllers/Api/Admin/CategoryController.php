<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends BaseController
{
    /** GET /admin/categories 分类树（含商品数） */
    public function index(): JsonResponse
    {
        $counts = \App\Models\Product::selectRaw('category_id, COUNT(*) AS n')
            ->groupBy('category_id')->pluck('n', 'category_id');

        $all = Category::orderBy('sort_order')->orderBy('id')->get();

        $list = $all->where(fn ($c) => $c->parent_id === null || (int) $c->parent_id === 0)
            ->values()->map(function ($top) use ($all, $counts) {
            return [
                'id' => $top->id,
                'code' => $top->code,
                'name' => $top->name,
                'level' => $top->level,
                'art' => $top->art_key,
                'sortOrder' => $top->sort_order,
                'status' => (bool) $top->status,
                'productCount' => (int) ($counts[$top->id] ?? 0),
                'children' => $all->where(fn ($c) => (int) $c->parent_id === (int) $top->id)->values()->map(fn ($c) => [
                    'id' => $c->id,
                    'code' => $c->code,
                    'name' => $c->name,
                    'parentId' => $c->parent_id,
                    'level' => $c->level,
                    'art' => $c->art_key,
                    'sortOrder' => $c->sort_order,
                    'status' => (bool) $c->status,
                    'productCount' => (int) ($counts[$c->id] ?? 0),
                ])->all(),
            ];
        })->all();

        return $this->ok(['list' => $list]);
    }

    /**
     * 分类编号规则：1 位字母（大小写均可）+ 数字 1~99（1~2 位）
     * 如 A01、c1、X99；拒绝 0、00、001、多字母（0[1-9] 兼容 01~09 两位写法）
     */
    private const CODE_RULE = 'regex:/^[A-Za-z](0[1-9]|[1-9]\d?)$/';

    /** POST /admin/categories 新增分类 */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'code' => ['required', 'string', 'max:32', 'unique:ssc_fenlei,code', self::CODE_RULE],
            'name' => 'required|string|max:64',
            'parentId' => 'nullable|integer',
            'art' => 'nullable|string|max:32',
            'sortOrder' => 'nullable|integer',
            'status' => 'nullable|boolean',
        ]);

        $parentId = $data['parentId'] ?? null;
        $level = 1;
        if ($parentId) {
            $parent = Category::find($parentId);
            if (!$parent) {
                return $this->fail('父分类不存在');
            }
            $level = $parent->level + 1;
            if ($level > 2) {
                return $this->fail('最多支持两级分类');
            }
        }

        $cat = Category::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'parent_id' => $parentId,
            'level' => $level,
            'art_key' => $data['art'] ?? null,
            'sort_order' => $data['sortOrder'] ?? 0,
            'status' => (int) ($data['status'] ?? 1),
        ]);

        return $this->ok(['id' => $cat->id], '分类已创建');
    }

    /** PUT /admin/categories/{id} 更新分类 */
    public function update(Request $request, int $id): JsonResponse
    {
        $cat = Category::find($id);
        if (!$cat) {
            return $this->fail('分类不存在', 404);
        }

        $data = $this->validate($request, [
            'code' => ['sometimes', 'required', 'string', 'max:32', 'unique:ssc_fenlei,code,' . $id, self::CODE_RULE],
            'name' => 'sometimes|required|string|max:64',
            'art' => 'nullable|string|max:32',
            'sortOrder' => 'nullable|integer',
            'status' => 'nullable|boolean',
        ]);

        $fill = collect($data)->filter(fn ($v) => $v !== null)->mapWithKeys(fn ($v, $k) => [
            ['art' => 'art_key', 'sortOrder' => 'sort_order'][$k] ?? \Illuminate\Support\Str::snake($k) => $v,
        ])->all();
        $cat->fill($fill);
        $cat->save();

        return $this->ok(null, '分类已更新');
    }

    /** DELETE /admin/categories/{id} 删除分类（有商品/子分类时拒绝） */
    public function destroy(int $id): JsonResponse
    {
        $cat = Category::find($id);
        if (!$cat) {
            return $this->fail('分类不存在', 404);
        }
        if ($cat->children()->exists()) {
            return $this->fail('请先删除该分类下的子分类');
        }
        if ($cat->products()->exists()) {
            return $this->fail('该分类下存在商品，无法删除');
        }

        $cat->delete();
        return $this->ok(null, '分类已删除');
    }
}
