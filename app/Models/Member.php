<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Member extends Model
{
    use HasApiTokens;

    protected $table = 'ssc_yonghu';

    protected $fillable = [
        'member_code', 'name', 'phone', 'password_hash', 'level_code', 'level_override',
        'total_spent', 'order_count', 'balance', 'points', 'status', 'register_type',
        'created_by', 'channel', 'verified_phone', 'password_set', 'source_inviter',
        'last_active_at',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'total_spent' => 'decimal:2',
        'balance' => 'decimal:2',
        'points' => 'integer',
        'order_count' => 'integer',
        'verified_phone' => 'boolean',
        'password_set' => 'boolean',
        'last_active_at' => 'datetime',
    ];

    /** 生效会员等级（手动指定优先） */
    public function getEffectiveLevel(): string
    {
        return $this->level_override ?: $this->level_code;
    }

    public function addresses()
    {
        return $this->hasMany(Address::class, 'member_id');
    }

    public function favorites()
    {
        return $this->hasMany(Favorite::class, 'member_id');
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'member_id');
    }

    public function userCoupons()
    {
        return $this->hasMany(UserCoupon::class, 'member_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'member_id');
    }

    public function returns()
    {
        return $this->hasMany(ReturnOrder::class, 'member_id');
    }
}
