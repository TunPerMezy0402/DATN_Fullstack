<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $table = 'orders';

    protected $fillable = [
        'user_id', 'sku', 'total_amount', 'discount_amount', 'final_amount',
        'coupon_id', 'coupon_code', 'status', 'payment_status', 'note'
    ];

public function items()
{
    return $this->hasMany(OrderItem::class, 'order_id');
}

public function coupon()
{
    return $this->belongsTo(Coupon::class, 'coupon_id');
}

public function shipping()
{
    return $this->hasOne(Shipping::class, 'order_id');
}

public function paymentTransactions()
{
    return $this->hasMany(PaymentTransaction::class, 'order_id');
}

public function returnRequests()
{
    return $this->hasMany(ReturnRequest::class, 'order_id');
}

public function cancelLogs()
{
    return $this->hasMany(OrderCancelLog::class, 'order_id');
}

}
