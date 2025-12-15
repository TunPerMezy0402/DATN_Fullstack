<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $table = 'coupons';

    protected $fillable = [
        'code',
        'discount_type',
        'discount_value',
        'min_purchase',
        'max_discount',
        'start_date',
        'end_date',
        'is_active',
        'usage_limit',
        'used_count',
        'limit_per_user',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'limit_per_user' => 'boolean',
    ];

    /** 🔗 Quan hệ: Coupon có thể áp dụng cho nhiều đơn hàng */
    public function orders()
    {
        return $this->hasMany(Order::class, 'coupon_id');
    }

    /** 🔗 Quan hệ: Coupon có nhiều lượt sử dụng bởi người dùng */
    public function usages()
    {
        return $this->hasMany(CouponUserUsage::class, 'coupon_id');
    }

    /**
     * 🔍 Kiểm tra mã còn hợp lệ cho user không
     */
    public function isValidForUser($userId): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->start_date && $this->start_date->isFuture()) {
            return false;
        }

        if ($this->end_date && $this->end_date->isPast()) {
            return false;
        }

        // Kiểm tra giới hạn tổng số lượt dùng
        if (!is_null($this->usage_limit) && $this->used_count >= $this->usage_limit) {
            return false;
        }

        // Nếu giới hạn mỗi user 1 lần
        if ($this->limit_per_user) {
            $alreadyUsed = $this->usages()
                ->where('user_id', $userId)
                ->exists();

            if ($alreadyUsed) {
                return false;
            }
        }

        return true;
    }

    /**
     * ⚙️ Áp dụng mã giảm giá cho user (ghi nhận + tăng lượt dùng)
     */
    public function applyForUser($userId)
    {
        if (!$this->isValidForUser($userId)) {
            throw new \Exception('Mã giảm giá không hợp lệ hoặc đã được sử dụng.');
        }

        // Nếu giới hạn mỗi user 1 lần → lưu lịch sử
        if ($this->limit_per_user) {
            $this->usages()->create(['user_id' => $userId]);
        }

        // Cập nhật số lượt sử dụng tổng
        $this->increment('used_count');
    }
}
