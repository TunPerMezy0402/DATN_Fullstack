<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderCancelLog extends Model
{
    protected $table = 'order_cancel_logs';

    protected $fillable = [
        'order_id', 'cancelled_by', 'reason', 'note'
    ];

    public $timestamps = false;

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
