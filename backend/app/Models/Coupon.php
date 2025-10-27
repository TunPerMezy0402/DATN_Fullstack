<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $table = 'coupons';

    protected $fillable = [
        'code', 'discount_type', 'discount_value', 'min_purchase',
        'max_discount', 'start_date', 'end_date', 'is_active'
    ];

    public function orders()
    {
        return $this->hasMany(Order::class, 'coupon_id');
    }
}
