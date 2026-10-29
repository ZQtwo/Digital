<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends BaseController
{
    /** GET /home 首页聚合：统计 + 主推 + 限时价 + 分类 + 热销 + 新品 + 轮播图 */
    public function index(): JsonResponse
    {
        $banners = $this->bannerList('home_top', 6);

        $base = Product::where('on_sale', 1);

        // HERO 统计：在售型号 / 覆盖品类 / 平均评分
        $stats = [
            'models' => (clone $base)->count(),
            'categories' => Category::where('status', 1)
                ->where(fn ($q) => $q->whereNull('parent_id')->orWhere('parent_id', 0))
                ->count(),
            'avgRating' => round((float) (clone $base)->avg('rating'), 1),
        ];

        // 主推商品：销量第一
        $feature = (clone $base)
            ->with(['brand:id,code,name', 'category:id,code,name'])
            ->orderByDesc('sales')
            ->first();

        // 限时价：有划线价且在售，按销量取前 4
        $deals = (clone $base)
            ->with(['brand:id,code,name', 'category:id,code,name'])
            ->whereColumn('list_price', '>', 'price')
            ->orderByDesc('sales')
            ->limit(4)
            ->get();

        $hot = (clone $base)
            ->with(['brand:id,code,name', 'category:id,code,name'])
            ->orderByDesc('sales')
            ->limit(8)
            ->get();

        $new = (clone $base)
            ->with(['brand:id,code,name', 'category:id,code,name'])
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        return $this->ok([
            'banners' => $banners,
            'stats' => $stats,
            'feature' => $feature ? $this->productCard($feature) : null,
            'deals' => $deals->map(fn ($p) => $this->productCard($p))->all(),
            'categories' => app(CategoryController::class)->treeData(),
            'hotProducts' => $hot->map(fn ($p) => $this->productCard($p))->all(),
            'newProducts' => $new->map(fn ($p) => $this->productCard($p))->all(),
        ]);
    }

    /** GET /banners?position=home_top 轮播图列表 */
    public function banners(Request $request): JsonResponse
    {
        $position = $request->query('position', 'home_top');
        return $this->ok([
            'list' => $this->bannerList($position, 20),
        ]);
    }

    /** 启用中且在投放期内的轮播图 */
    protected function bannerList(string $position, int $limit): array
    {
        $now = now();
        return Banner::where('position', $position)
            ->where('enabled', 1)
            ->where(fn ($q) => $q->whereNull('start_at')->orWhere('start_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('end_at')->orWhere('end_at', '>=', $now))
            ->orderByDesc('weight')
            ->limit($limit)
            ->get(['id', 'position', 'title', 'image_url', 'link_url'])
            ->map(fn ($b) => [
                'id' => $b->id,
                'position' => $b->position,
                'title' => $b->title,
                'image' => $b->image_url,
                'link' => $b->link_url,
            ])->all();
    }

    /** 商品卡片字段（列表/首页） */
    public static function productCard(Product $p): array
    {
        return [
            'id' => $p->id,
            'skuCode' => $p->sku_code,
            'name' => $p->name,
            'subtitle' => $p->subtitle,
            'brand' => $p->brand?->name,
            'category' => self::catSlug($p->category?->code),
            'art' => $p->art_key,
            'artSeed' => $p->art_seed,
            'price' => (float) $p->price,
            'listPrice' => (float) $p->list_price,
            'rating' => (float) $p->rating,
            'ratingCount' => $p->rating_count,
            'sales' => $p->sales,
            'stock' => $p->stock,
            'tags' => $p->tags ?: [],
        ];
    }
}
