<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorite extends Model
{
    protected $table = 'ssc_shoucang';

    public $timestamps = false;

    protected $fillable = ['member_id', 'product_id', 'created_at'];

    protected $casts = ['created_at' => 'datetime'];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
