<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public const CREATED_AT = null;

    protected $table = 'ssc_shezhi';

    protected $fillable = [
        'site_name', 'site_subtitle', 'default_theme', 'date_format', 'currency',
        'order_notify', 'alert_threshold', 'copyright',
    ];

    protected $casts = [
        'order_notify' => 'boolean',
        'alert_threshold' => 'integer',
    ];

    /** 单行配置：固定 id=1 */
    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1]);
    }
}
