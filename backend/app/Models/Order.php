<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use SoftDeletes;

    protected $table = 'orders';

    protected $fillable = [
        'user_id',
        'sku',
        'total_amount',
        'discount_amount',
        'final_amount',
        'shipping_fee',
        'status',
        'payment_status',
        'payment_method',
        'note',
        'shipping_name',
        'shipping_phone',
        'city',
        'district',
        'commune',
        'village',
        'shipping_notes',
        'coupon_code',
        'coupon_id',
        'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'deleted_at' => 'datetime',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
    ];

    // ==================== RELATIONSHIPS ====================

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

    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id');
    }

    public function latestTransaction()
    {
        return $this->hasOne(PaymentTransaction::class, 'order_id')->latestOfMany();
    }

    public function successfulTransactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id')
            ->where('status', 'success');
    }

    public function paymentTransaction()
    {
        return $this->latestTransaction();
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