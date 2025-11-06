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

    /**
     * User relationship
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Order items relationship
     */
    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    /**
     * Coupon relationship
     */
    public function coupon()
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    /**
     * Shipping information relationship
     */
    public function shipping()
    {
        return $this->hasOne(Shipping::class, 'order_id');
    }

    /**
     * Payment transactions relationship (all transactions)
     */
    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id');
    }

    /**
     * Latest payment transaction relationship
     */
    public function latestTransaction()
    {
        return $this->hasOne(PaymentTransaction::class, 'order_id')->latestOfMany();
    }

    /**
     * Successful payment transactions only
     */
    public function successfulTransactions()
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id')
            ->where('status', 'success');
    }

    /**
     * Single payment transaction (backward compatibility)
     * Alias for latestTransaction()
     */
    public function paymentTransaction()
    {
        return $this->latestTransaction();
    }

    /**
     * Return requests relationship
     */
    public function returnRequests()
    {
        return $this->hasMany(ReturnRequest::class, 'order_id');
    }

    /**
     * Cancel logs relationship
     */
    public function cancelLogs()
    {
        return $this->hasMany(OrderCancelLog::class, 'order_id');
    }

    // ==================== SCOPES ====================

    /**
     * Scope: Orders with paid status
     */
    public function scopePaid($query)
    {
        return $query->where('payment_status', 'paid');
    }

    /**
     * Scope: Orders with pending payment
     */
    public function scopePendingPayment($query)
    {
        return $query->where('payment_status', 'pending');
    }

    /**
     * Scope: Orders with failed payment
     */
    public function scopeFailedPayment($query)
    {
        return $query->where('payment_status', 'failed');
    }

    /**
     * Scope: Orders with specific status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Orders by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Orders within date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    // ==================== ACCESSORS ====================

    /**
     * Get order status text in Vietnamese
     */
    public function getStatusTextAttribute()
    {
        $statuses = [
            'pending' => 'Chờ xác nhận',
            'confirmed' => 'Đã xác nhận',
            'processing' => 'Đang xử lý',
            'shipping' => 'Đang giao hàng',
            'delivered' => 'Đã giao hàng',
            'completed' => 'Hoàn thành',
            'cancelled' => 'Đã hủy',
            'returned' => 'Đã trả hàng',
        ];

        return $statuses[$this->status] ?? $this->status;
    }

    /**
     * Get payment status text in Vietnamese
     */
    public function getPaymentStatusTextAttribute()
    {
        $statuses = [
            'unpaid' => 'Chưa thanh toán',
            'pending' => 'Đang xử lý',
            'paid' => 'Đã thanh toán',
            'failed' => 'Thất bại',
            'refunded' => 'Đã hoàn tiền',
        ];

        return $statuses[$this->payment_status] ?? $this->payment_status;
    }

    /**
     * Get payment method text in Vietnamese
     */
    public function getPaymentMethodTextAttribute()
    {
        $methods = [
            'cod' => 'COD (Thanh toán khi nhận hàng)',
            'vnpay' => 'VNPay',
            'momo' => 'MoMo',
            'zalopay' => 'ZaloPay',
        ];

        return $methods[$this->payment_method] ?? $this->payment_method;
    }

    /**
     * Get full shipping address
     */
    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->village,
            $this->commune,
            $this->district,
            $this->city,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Check if order is paid
     */
    public function getIsPaidAttribute()
    {
        return $this->payment_status === 'paid';
    }

    /**
     * Check if order can be cancelled
     */
    public function getCanBeCancelledAttribute()
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    // ==================== METHODS ====================

    /**
     * Calculate total items count
     */
    public function getTotalItems()
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Check if order has a successful payment transaction
     */
    public function hasSuccessfulPayment()
    {
        return $this->transactions()
            ->where('status', 'success')
            ->exists();
    }

    /**
     * Get the latest successful transaction
     */
    public function getLatestSuccessfulTransaction()
    {
        return $this->transactions()
            ->where('status', 'success')
            ->latest()
            ->first();
    }

    /**
     * Mark order as paid
     */
    public function markAsPaid($paidAt = null)
    {
        $this->payment_status = 'paid';
        $this->paid_at = $paidAt ?? now();
        $this->save();

        return $this;
    }

    /**
     * Mark order as failed
     */
    public function markAsFailed()
    {
        $this->payment_status = 'failed';
        $this->save();

        return $this;
    }

    /**
     * Cancel order with reason
     */
    public function cancel($reason = null, $cancelledBy = null)
    {
        if (!$this->can_be_cancelled) {
            throw new \Exception('Không thể hủy đơn hàng này');
        }

        $this->status = 'cancelled';
        $this->save();

        // Log cancel action
        if (class_exists(OrderCancelLog::class)) {
            $this->cancelLogs()->create([
                'reason' => $reason,
                'cancelled_by' => $cancelledBy,
                'cancelled_at' => now(),
            ]);
        }

        return $this;
    }
}