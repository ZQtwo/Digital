<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderFeedback extends Model
{
    protected $table = 'ssc_dingdan_fankui';

    protected $fillable = [
        'member_id', 'order_id', 'order_no', 'type', 'subject', 'content',
        'contact', 'status', 'admin_reply', 'replied_at',
    ];

    protected $casts = [
        'replied_at' => 'datetime',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    /** 合法 type 枚举 */
    public const TYPES = ['suggestion', 'complaint', 'praise', 'bug'];

    /** 合法 status 枚举 */
    public const STATUSES = ['pending', 'processing', 'resolved', 'closed'];
}
