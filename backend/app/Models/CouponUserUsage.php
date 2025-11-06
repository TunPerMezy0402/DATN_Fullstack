<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CouponUserUsage extends Model
{
    protected $table = 'coupon_user_usages';

    protected $fillable = [
        'coupon_id',
        'user_id',
        'used_at',
    ];

    public $timestamps = false;

    protected $casts = [
        'used_at' => 'datetime',
    ];

    public function coupon()
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
