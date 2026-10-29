<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $table = 'ssc_dingdan_xiangmu';

    protected $fillable = [
        'order_id', 'product_id', 'product_name', 'sku_code', 'price', 'quantity',
        'spec_snapshot', 'subtotal', 'comment_id',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'quantity' => 'integer',
        'spec_snapshot' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function review()
    {
        return $this->belongsTo(Review::class, 'comment_id');
    }
}
