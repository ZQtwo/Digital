<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Brand;
use Illuminate\Http\JsonResponse;

class BrandController extends BaseController
{
    /** GET /brands 品牌列表（启用中） */
    public function index(): JsonResponse
    {
        $list = Brand::where('status', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'code', 'name', 'logo_url'])
            ->map(fn ($b) => [
                'id' => $b->id,
                'code' => $b->code,
                'name' => $b->name,
                'logo' => $b->logo_url,
            ])->all();

        return $this->ok(['list' => $list]);
    }
}
