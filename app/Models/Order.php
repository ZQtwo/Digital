<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table = 'ssc_dingdan';

    /** 订单状态机（与前端 store-orders.js 一致） */
    public const STATUS_LABELS = [
        'pending_pay' => '待付款',
        'pending_ship' => '待发货',
        'shipped' => '待收货',
        'completed' => '已完成',
        'cancelled' => '已取消',
    ];

    protected $fillable = [
        'order_no', 'member_id', 'status', 'total_amount', 'discount_amount', 'freight',
        'pay_amount', 'coupon_id', 'pay_method', 'receiver_name', 'receiver_phone',
        'receiver_address', 'remark', 'pay_at', 'ship_at', 'complete_at', 'cancel_at',
        'cancel_reason',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'freight' => 'decimal:2',
        'pay_amount' => 'decimal:2',
        'pay_at' => 'datetime',
        'ship_at' => 'datetime',
        'complete_at' => 'datetime',
        'cancel_at' => 'datetime',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function coupon()
    {
        return $this->belongsTo(UserCoupon::class, 'coupon_id');
    }

    public function returns()
    {
        return $this->hasMany(ReturnOrder::class, 'order_id');
    }

    /** 当前状态是否可取消（与前端一致：completed/cancelled 不可取消） */
    public function isCancellable(): bool
    {
        return in_array($this->status, ['pending_pay', 'pending_ship', 'shipped'], true);
    }
}
