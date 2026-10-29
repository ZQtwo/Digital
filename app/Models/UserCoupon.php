<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserCoupon extends Model
{
    public $timestamps = false;

    protected $table = 'ssc_yonghu_youhuiquan';

    protected $fillable = [
        'member_id', 'template_id', 'title', 'amount', 'threshold', 'scope',
        'order_id', 'used', 'claimed_at', 'expire_at', 'used_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'threshold' => 'decimal:2',
        'used' => 'boolean',
        'claimed_at' => 'datetime',
        'expire_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function template()
    {
        return $this->belongsTo(CouponTemplate::class, 'template_id');
    }

    /** 是否仍可用（未使用且未过期） */
    public function isUsable(): bool
    {
        return !$this->used && $this->expire_at?->isFuture();
    }
}
