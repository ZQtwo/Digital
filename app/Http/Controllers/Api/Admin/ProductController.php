<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Brand;
use App\Models\Category;
use App\Models\InventoryLog;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends BaseController
{
    /** GET /admin/products?keyword=&categoryId=&onSale=&lowStock=&page=&pageSize= */
    public function index(Request $request): JsonResponse
    {
        $q = Product::with(['brand:id,code,name', 'category:id,code,name']);

        if ($kw = trim((string) $request->query('keyword', ''))) {
            $q->where(function ($w) use ($kw) {
                $w->where('name', 'like', "%{$kw}%")
                  ->orWhere('sku_code', 'like', "%{$kw}%");
            });
        }
        if ($categoryId = $request->query('categoryId')) {
            $ids = [$categoryId];
            $ids = array_merge($ids, Category::where('parent_id', $categoryId)->pluck('id')->all());
            $q->whereIn('category_id', $ids);
        }
        if (($onSale = $request->query('onSale')) !== null && $onSale !== '') {
            $q->where('on_sale', (int) $onSale);
        }
        if ($request->boolean('lowStock')) {
            $q->whereColumn('stock', '<=', 'threshold');
        }

        $page = $this->paginate($q->orderBy('id')->paginate($this->pageSize($request)), fn ($p) => $this->row($p));

        $page['stats'] = [
            'total' => Product::count(),
            'onSale' => Product::where('on_sale', 1)->count(),
            'offSale' => Product::where('on_sale', 0)->count(),
            'lowStock' => Product::where('on_sale', 1)->whereColumn('stock', '<=', 'threshold')->count(),
        ];

        return $this->ok($page);
    }

    /** POST /admin/products 新增商品（含初始库存流水） */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validate($request, [
            'name' => 'required|string|max:128',
            'subtitle' => 'nullable|string|max:256',
            'brandId' => 'required|integer',
            'categoryId' => 'required|integer',
            'skuCode' => 'nullable|string|max:32|unique:ssc_shangpin,sku_code',
            'artKey' => 'nullable|string|max:32',
            'artSeed' => 'nullable|integer',
            'price' => 'required|numeric|min:0',
            'listPrice' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'threshold' => 'nullable|integer|min:0',
            'tags' => 'nullable|array',
            'highlights' => 'nullable|array',
            'specs' => 'nullable|array',
            'options' => 'nullable|array',
            'description' => 'nullable|string|max:5000',
            'onSale' => 'nullable|boolean',
        ]);

        if (!Brand::find($data['brandId'])) {
            return $this->fail('品牌不存在');
        }
        if (!Category::find($data['categoryId'])) {
            return $this->fail('分类不存在');
        }

        $product = DB::transaction(function () use ($data) {
            // 【修复】SKU 序号必须基于 sku_code 本身的最大数字，而非 max(id)。
            // 历史数据 sku 与 id 脱钩（如 id=31 的 sku 是 p35），用 max(id)+1 会撞唯一索引。
            $sku = $data['skuCode'] ?? null;
            if (!$sku) {
                $maxNum = 0;
                Product::where('sku_code', 'like', 'p%')->pluck('sku_code')->each(function ($s) use (&$maxNum) {
                    if (preg_match('/^p(\d+)$/i', (string) $s, $m)) {
                        $maxNum = max($maxNum, (int) $m[1]);
                    }
                });
                $sku = 'p' . str_pad((string) ($maxNum + 1), 2, '0', STR_PAD_LEFT);
                $suffix = 0;
                while (Product::where('sku_code', $sku)->exists()) {
                    $sku = 'p' . str_pad((string) ($maxNum + 1), 2, '0', STR_PAD_LEFT) . '-' . (++$suffix);
                }
            }

            $product = Product::create([
                'sku_code' => $sku,
                'name' => $data['name'],
                'subtitle' => $data['subtitle'] ?? null,
                'brand_id' => $data['brandId'],
                'category_id' => $data['categoryId'],
                'art_key' => $data['artKey'] ?? null,
                'art_seed' => $data['artSeed'] ?? 1,
                'price' => $data['price'],
                'list_price' => $data['listPrice'] ?? $data['price'],
                'stock' => $data['stock'],
                'threshold' => $data['threshold'] ?? 20,
                'tags' => $data['tags'] ?? null,
                'highlights' => $data['highlights'] ?? null,
                'specs' => $data['specs'] ?? null,
                'options' => $data['options'] ?? null,
                'description' => $data['description'] ?? null,
                'on_sale' => (bool) ($data['onSale'] ?? true),
                'rating' => 5.0,
                'rating_count' => 0,
                'sales' => 0,
            ]);

            if ($product->stock > 0) {
                InventoryLog::create([
                    'group_id' => 'NEW-' . $product->sku_code,
                    'product_id' => $product->id,
                    'type_code' => 'in',
                    'quantity' => $product->stock,
                    'before_val' => 0,
                    'after_val' => $product->stock,
                    'reason' => '新增商品建档',
                    'operator' => auth()->user()?->admin_code,
                ]);
            }

            return $product;
        });

        return $this->ok(['id' => $product->id], '商品已创建');
    }

    /** GET /admin/products/{id} */
    public function show(int $id): JsonResponse
    {
        $p = Product::with(['brand:id,code,name', 'category:id,code,name'])->find($id);
        if (!$p) {
            return $this->fail('商品不存在', 404);
        }
        return $this->ok($this->detail($p));
    }

    /** PUT /admin/products/{id} 编辑商品（不含库存，库存走库存管理） */
    public function update(Request $request, int $id): JsonResponse
    {
        $p = Product::find($id);
        if (!$p) {
            return $this->fail('商品不存在', 404);
        }

        $data = $this->validate($request, [
            'name' => 'sometimes|required|string|max:128',
            'subtitle' => 'nullable|string|max:256',
            'brandId' => 'sometimes|required|integer',
            'categoryId' => 'sometimes|required|integer',
            'artKey' => 'nullable|string|max:32',
            'artSeed' => 'nullable|integer',
            'price' => 'sometimes|required|numeric|min:0',
            'listPrice' => 'nullable|numeric|min:0',
            'threshold' => 'nullable|integer|min:0',
            'tags' => 'nullable|array',
            'highlights' => 'nullable|array',
            'specs' => 'nullable|array',
            'options' => 'nullable|array',
            'description' => 'nullable|string|max:5000',
        ]);

        $map = ['brandId' => 'brand_id', 'categoryId' => 'category_id', 'artKey' => 'art_key',
            'artSeed' => 'art_seed', 'listPrice' => 'list_price'];
        $fill = collect($data)->filter(fn ($v) => $v !== null)
            ->mapWithKeys(fn ($v, $k) => [$map[$k] ?? \Illuminate\Support\Str::snake($k) => $v])->all();
        $p->fill($fill);
        $p->save();

        return $this->ok(null, '商品已更新');
    }

    /** DELETE /admin/products/{id} 删除商品（有订单引用时拒绝） */
    public function destroy(int $id): JsonResponse
    {
        $p = Product::find($id);
        if (!$p) {
            return $this->fail('商品不存在', 404);
        }
        if ($p->orderItems()->exists()) {
            return $this->fail('该商品存在订单记录，建议下架而非删除');
        }

        $p->delete();
        return $this->ok(null, '商品已删除');
    }

    /** PUT /admin/products/{id}/on-sale {onSale} 上下架 */
    public function setOnSale(Request $request, int $id): JsonResponse
    {
        $data = $this->validate($request, ['onSale' => 'required|boolean']);
        $p = Product::find($id);
        if (!$p) {
            return $this->fail('商品不存在', 404);
        }

        $p->forceFill(['on_sale' => $data['onSale']])->save();

        return $this->ok(null, $data['onSale'] ? '商品已上架' : '商品已下架');
    }

    /** PUT /admin/products/{id}/price {price, listPrice?} 改价 */
    public function setPrice(Request $request, int $id): JsonResponse
    {
        $data = $this->validate($request, [
            'price' => 'required|numeric|min:0',
            'listPrice' => 'nullable|numeric|min:0',
        ]);
        $p = Product::find($id);
        if (!$p) {
            return $this->fail('商品不存在', 404);
        }

        $p->forceFill([
            'price' => $data['price'],
            'list_price' => $data['listPrice'] ?? $p->list_price,
        ])->save();

        return $this->ok(null, '价格已更新');
    }

    /* ------------------------------------------------------------------ */

    protected function row(Product $p): array
    {
        return [
            'id' => $p->id,
            'skuCode' => $p->sku_code,
            'name' => $p->name,
            'brand' => $p->brand?->name,
            'brandId' => $p->brand_id,
            'category' => $p->category?->name,
            'categoryId' => $p->category_id,
            'art' => $p->art_key,
            'artSeed' => $p->art_seed,
            'price' => (float) $p->price,
            'listPrice' => (float) $p->list_price,
            'rating' => (float) $p->rating,
            'ratingCount' => $p->rating_count,
            'sales' => $p->sales,
            'stock' => $p->stock,
            'threshold' => $p->threshold,
            'lowStock' => $p->stock <= $p->threshold,
            'onSale' => (bool) $p->on_sale,
        ];
    }

    protected function detail(Product $p): array
    {
        return $this->row($p) + [
            'subtitle' => $p->subtitle,
            'tags' => $p->tags ?: [],
            'highlights' => $p->highlights ?: [],
            'specs' => $p->specs ?: (object) [],
            'options' => $p->options ?: [],
            'description' => (string) $p->description,
        ];
    }
}
