<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReturnRequest extends Model
{
    protected $table = 'return_requests';

    protected $fillable = [
        'order_id', 'user_id', 'reason', 'status',
        'refund_amount', 'requested_at', 'processed_at', 'note'
    ];

    public $timestamps = false;

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
