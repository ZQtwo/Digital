<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    protected $table = 'ssc_dizhi';

    protected $fillable = [
        'member_id', 'receiver_name', 'phone', 'province', 'city', 'district',
        'detail', 'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /** 完整地区串（省 市 区），供下单快照 */
    public function fullRegion(): string
    {
        return trim($this->province . ' ' . $this->city . ' ' . $this->district);
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
