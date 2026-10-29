<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryLog extends Model
{
    protected $table = 'ssc_kucun_rizhi';

    public $timestamps = false;

    protected $fillable = [
        'group_id', 'product_id', 'type_code', 'quantity', 'before_val', 'after_val',
        'reason', 'operator', 'undo_of', 'created_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'before_val' => 'integer',
        'after_val' => 'integer',
        'created_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
