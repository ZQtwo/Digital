<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Banner extends Model
{
    protected $table = 'ssc_hengfu';

    protected $fillable = [
        'position', 'title', 'image_url', 'link_url', 'weight', 'enabled',
        'start_at', 'end_at', 'created_by',
    ];

    protected $casts = [
        'weight' => 'integer',
        'enabled' => 'boolean',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];
}
