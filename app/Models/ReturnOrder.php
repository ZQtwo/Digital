<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnOrder extends Model
{
    protected $table = 'ssc_tuihuanhuo';

    /** 状态流转：pending → approved/rejected → completed */
    public const TRANSITIONS = [
        'pending' => ['approved', 'rejected'],
        'approved' => ['completed'],
        'rejected' => [],
        'completed' => [],
        'cancelled' => [],
    ];

    protected $fillable = [
        'return_no', 'order_id', 'member_id', 'type_code', 'reason', 'amount',
        'status', 'status_timeline', 'operator', 'handle_note',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'status_timeline' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
