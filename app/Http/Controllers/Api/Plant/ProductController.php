<?php

namespace App\Http\Controllers\Api\Plant;

use App\Http\Controllers\Api\BaseController;

use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends BaseController
{
    /** GET /products 商品列表（keyword/categoryId/brandId/priceMin/priceMax/sort/page/pageSize） */
    public function index(Request $request): JsonResponse
    {
        $q = Product::with(['brand:id,code,name', 'category:id,code,name'])
            ->where('on_sale', 1);

        // 关键词：名称/副标题/品牌名
        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('name', 'like', "%{$kw}%")
                  ->orWhere('subtitle', 'like', "%{$kw}%")
                  ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', "%{$kw}%"));
            });
        }

        // 分类（含子分类）
        if ($categoryId = $request->query('categoryId')) {
            $ids = [$categoryId];
            $ids = array_merge($ids, Category::where('parent_id', $categoryId)->pluck('id')->all());
            $q->whereIn('category_id', $ids);
        }

        if ($brandId = $request->query('brandId')) {
            $q->where('brand_id', $brandId);
        }

        // 价格区间
        $priceMin = $request->query('priceMin');
        $priceMax = $request->query('priceMax');
        if ($priceMin !== null && $priceMin !== '') {
            $q->where('price', '>=', (float) $priceMin);
        }
        if ($priceMax !== null && $priceMax !== '') {
            $q->where('price', '<=', (float) $priceMax);
        }

        // 排序：default/price_asc/price_desc/sales/rating
        match ($request->query('sort', 'default')) {
            'price_asc' => $q->orderBy('price'),
            'price_desc' => $q->orderByDesc('price'),
            'sales' => $q->orderByDesc('sales'),
            'rating' => $q->orderByDesc('rating'),
            default => $q->orderBy('sort_order')->orderByDesc('id'),
        };

        $page = $this->paginate($q->paginate($this->pageSize($request)), function ($p) {
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
        });

        // 价格带 + 品牌筛选（与前端 data.js 的 priceBands/brandList 对应）
        $page['priceBands'] = [
            ['min' => 0, 'max' => 2000, 'label' => '2000以下'],
            ['min' => 2000, 'max' => 5000, 'label' => '2000-5000'],
            ['min' => 5000, 'max' => 10000, 'label' => '5000-10000'],
            ['min' => 10000, 'max' => null, 'label' => '10000以上'],
        ];

        return $this->ok($page);
    }

    /** GET /products/{id} 商品详情（含规格/相关推荐/评价概览）——不限定在售，订单跳转需能查看已下架商品 */
    public function show(Request $request, int $id): JsonResponse
    {
        $p = Product::with(['brand:id,code,name', 'category:id,code,name'])
            ->find($id);

        if (!$p) {
            return $this->fail('商品不存在或已下架', 404);
        }

        // 相关推荐：同分类其它上架商品
        $related = Product::with('brand:id,name')
            ->where('on_sale', 1)
            ->where('category_id', $p->category_id)
            ->where('id', '!=', $p->id)
            ->orderByDesc('sales')
            ->limit(4)
            ->get();

        // 评价概览
        $reviewStats = Review::where('product_id', $p->id)
            ->where('status', 1)
            ->selectRaw('COUNT(*) AS total, AVG(rating) AS avg_rating')
            ->first();

        $favored = false;
        if ($user = $request->user()) {
            $favored = $user->favorites()->where('product_id', $p->id)->exists();
        }

        return $this->ok([
            'id' => $p->id,
            'skuCode' => $p->sku_code,
            'name' => $p->name,
            'subtitle' => $p->subtitle,
            'brand' => $p->brand?->name,
            'brandId' => $p->brand_id,
            'category' => self::catSlug($p->category?->code),
            'categoryId' => $p->category_id,
            'art' => $p->art_key,
            'artSeed' => $p->art_seed,
            'price' => (float) $p->price,
            'listPrice' => (float) $p->list_price,
            'rating' => (float) $p->rating,
            'ratingCount' => $p->rating_count,
            'sales' => $p->sales,
            'stock' => $p->stock,
            'tags' => $p->tags ?: [],
            'highlights' => $p->highlights ?: [],
            'specs' => $p->specs ?: (object) [],
            'options' => $p->options ?: [],
            'description' => (string) $p->description,
            'favored' => $favored,
            'reviewStats' => [
                'total' => (int) ($reviewStats->total ?? 0),
                'avgRating' => round((float) ($reviewStats->avg_rating ?? 5), 1),
            ],
            'related' => $related->map(fn ($r) => HomeController::productCard($r))->all(),
        ]);
    }

    /** GET /products/{id}/reviews 商品评价列表（rating 筛选/分页） */
    public function reviews(Request $request, int $id): JsonResponse
    {
        $q = Review::with('member:id,name')
            ->where('product_id', $id)
            ->where('status', 1);

        if ($rating = $request->query('rating')) {
            $q->where('rating', (int) $rating);
        }

        $page = $this->paginate($q->orderByDesc('id')->paginate($this->pageSize($request, 10)), function ($r) {
            return [
                'id' => $r->id,
                'author' => $r->anonymous ? '匿名用户' : ($r->nickname_snapshot ?: ($r->member?->name ?? '用户')),
                'avatarSeed' => $r->member_id,
                'rating' => $r->rating,
                'content' => (string) $r->content,
                'tag' => $r->tag,
                'ts' => $r->created_at?->timestamp,
                'time' => $r->created_at?->format('Y-m-d H:i'),
            ];
        });

        return $this->ok($page);
    }
}
