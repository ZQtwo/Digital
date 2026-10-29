<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends BaseController
{
    /** GET /categories 分类树（启用中，含各分类上架商品数） */
    public function tree(): JsonResponse
    {
        return $this->ok(['list' => $this->treeData()]);
    }

    /** 分类树数据（供 home 复用） */
    public function treeData(): array
    {
        $counts = \App\Models\Product::where('on_sale', 1)
            ->selectRaw('category_id, COUNT(*) AS n')
            ->groupBy('category_id')
            ->pluck('n', 'category_id');

        $all = Category::where('status', 1)->orderBy('sort_order')->orderBy('id')->get();

        return $all->where(fn ($c) => $c->parent_id === null || (int) $c->parent_id === 0)
            ->values()->map(function ($top) use ($all, $counts) {
            return [
                'id' => $top->id,
                'code' => $top->code,
                'name' => $top->name,
                'art' => $top->art_key,
                'count' => (int) ($counts[$top->id] ?? 0),
                'children' => $all->where(fn ($c) => (int) $c->parent_id === (int) $top->id)->values()->map(function ($sub) use ($counts) {
                    return [
                        'id' => $sub->id,
                        'code' => $sub->code,
                        'name' => $sub->name,
                        'art' => $sub->art_key,
                        'parentId' => $sub->parent_id,
                        'count' => (int) ($counts[$sub->id] ?? 0),
                    ];
                })->all(),
            ];
        })->all();
    }
}
