<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $table = 'ssc_fenlei';

    protected $fillable = [
        'code', 'name', 'parent_id', 'level', 'art_key', 'sort_order', 'status',
    ];

    protected $casts = [
        'level' => 'integer',
        'sort_order' => 'integer',
        'status' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}
