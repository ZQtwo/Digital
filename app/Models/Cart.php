<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'ssc_gouwuche';

    protected $fillable = [
        'member_id', 'product_id', 'quantity', 'spec_snapshot',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'spec_snapshot' => 'array',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /** 商品当前价格（优先取 Product.price） */
    public function getCurrentPrice(): float
    {
        return (float) ($this->product->price ?? 0);
    }

    /** 小计 = 商品现价 × 数量 */
    public function getSubtotal(): float
    {
        return round($this->getCurrentPrice() * $this->quantity, 2);
    }
}
