<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes; // <-- thêm

class Order extends Model
{
    use SoftDeletes; // <-- thêm

    protected $table = 'orders';

    protected $fillable = [
        'user_id', 'sku', 'total_amount', 'discount_amount', 'final_amount', 'status', 'payment_status', 'note'
    ];

    protected $dates = ['deleted_at']; // optional, Laravel tự cast deleted_at thành Carbon

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

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

    /* public function paymentTransactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id');
    }
 */
    public function paymentTransaction()
{
    return $this->hasOne(PaymentTransaction::class, 'order_id');
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
