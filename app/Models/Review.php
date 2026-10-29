<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'ssc_pingjia';

    protected $fillable = [
        'product_id', 'member_id', 'order_id', 'order_item_id', 'rating', 'content',
        'tag', 'anonymous', 'nickname_snapshot', 'status',
    ];

    protected $casts = [
        'rating' => 'integer',
        'anonymous' => 'boolean',
        'status' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
