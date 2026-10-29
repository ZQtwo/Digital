<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    protected $table = 'ssc_pinpai';

    protected $fillable = ['code', 'name', 'logo_url', 'sort_order', 'status'];

    protected $casts = [
        'sort_order' => 'integer',
        'status' => 'boolean',
    ];

    public function products()
    {
        return $this->hasMany(Product::class, 'brand_id');
    }
}
