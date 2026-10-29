<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'ssc_shangpin';

    protected $fillable = [
        'sku_code', 'name', 'subtitle', 'brand_id', 'category_id', 'art_key', 'art_seed',
        'cover_image', 'price', 'list_price', 'rating', 'rating_count', 'sales', 'stock',
        'threshold', 'tags', 'highlights', 'specs', 'options', 'description',
        'on_sale', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'list_price' => 'decimal:2',
        'rating' => 'decimal:1',
        'rating_count' => 'integer',
        'sales' => 'integer',
        'stock' => 'integer',
        'threshold' => 'integer',
        'tags' => 'array',
        'highlights' => 'array',
        'specs' => 'array',
        'options' => 'array',
        'on_sale' => 'boolean',
        'art_seed' => 'integer',
        'sort_order' => 'integer',
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'product_id');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'product_id');
    }

    /** 是否低库存（达到预警阈值） */
    public function isLowStock(): bool
    {
        return $this->stock <= $this->threshold;
    }
}
