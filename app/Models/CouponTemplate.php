<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CouponTemplate extends Model
{
    protected $table = 'ssc_youhuiquan_moban';

    protected $fillable = [
        'coupon_code', 'title', 'amount', 'threshold', 'valid_days', 'scope',
        'scope_value', 'description', 'total_count', 'remaining', 'per_limit', 'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'threshold' => 'decimal:2',
        'valid_days' => 'integer',
        'total_count' => 'integer',
        'remaining' => 'integer',
        'per_limit' => 'integer',
        'status' => 'boolean',
    ];

    public function userCoupons()
    {
        return $this->hasMany(UserCoupon::class, 'template_id');
    }
}
