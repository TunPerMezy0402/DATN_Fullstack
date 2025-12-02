<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shipping extends Model
{
    use HasFactory;

    protected $table = 'shipping';

    // ============================================================
    //                         CONSTANTS
    // ============================================================
    
    const STATUS_PENDING = 'pending';
    const STATUS_NODONE = 'nodone';
    const STATUS_IN_TRANSIT = 'in_transit';
    const STATUS_DELIVERED = 'delivered';
    const STATUS_RECEIVED = 'received';
    const STATUS_RETURN_PROCESSING = 'return_processing';
    const STATUS_RETURNED = 'returned';
    const STATUS_CANCELLED = 'cancelled';

    // ============================================================
    //                         FILLABLE
    // ============================================================

    protected $fillable = [
        'order_id',
        'sku',
        'shipping_name',
        'shipping_phone',
        'shipping_status',
        'user_image',
        'transfer_image',
        'reason',
        'reason_admin',
        'city',
        'district',
        'commune',
        'village',
        'notes',
        'shipping_fee',
        'received_at',
    ];

    protected $casts = [
        'shipping_fee' => 'decimal:2',
        'received_at' => 'datetime',
    ];

    public $timestamps = true;

    // ============================================================
    //                         RELATIONSHIPS
    // ============================================================

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function logs()
    {
        return $this->hasMany(ShippingLog::class, 'shipping_id');
    }

    // ============================================================
    //                         SCOPES
    // ============================================================

    public function scopePending($query)
    {
        return $query->where('shipping_status', self::STATUS_PENDING);
    }

    public function scopeNodone($query)
    {
        return $query->where('shipping_status', self::STATUS_NODONE);
    }

    public function scopeInTransit($query)
    {
        return $query->where('shipping_status', self::STATUS_IN_TRANSIT);
    }

    public function scopeDelivered($query)
    {
        return $query->where('shipping_status', self::STATUS_DELIVERED);
    }

    public function scopeReceived($query)
    {
        return $query->where('shipping_status', self::STATUS_RECEIVED);
    }

    public function scopeReturnProcessing($query)
    {
        return $query->where('shipping_status', self::STATUS_RETURN_PROCESSING);
    }

    public function scopeReturned($query)
    {
        return $query->where('shipping_status', self::STATUS_RETURNED);
    }

    public function scopeCancelled($query)
    {
        return $query->where('shipping_status', self::STATUS_CANCELLED);
    }

    // ============================================================
    //                         METHODS
    // ============================================================

    /**
     * Kiểm tra có thể hủy không
     * Chỉ cho phép hủy khi trạng thái là pending hoặc nodone
     */
    public function canCancel(): bool
    {
        return in_array($this->shipping_status, [self::STATUS_PENDING, self::STATUS_NODONE]);
    }

    /**
     * Kiểm tra có thể hoàn hàng không
     * Chỉ cho phép hoàn khi:
     * - Đã nhận hàng (received)
     * - Có thời gian nhận hàng
     * - Chưa quá 7 ngày kể từ khi nhận
     */
    public function canReturn(): bool
    {
        return $this->shipping_status === self::STATUS_RECEIVED
            && $this->received_at !== null
            && !$this->isReturnExpired();
    }

    /**
     * Kiểm tra đã quá hạn hoàn hàng chưa (7 ngày)
     */
    public function isReturnExpired(): bool
    {
        if (!$this->received_at) {
            return true;
        }

        return now()->diffInDays($this->received_at) > 7;
    }

    /**
     * Lấy số ngày còn lại để có thể hoàn hàng
     */
    public function getRemainingReturnDays(): int
    {
        if (!$this->received_at) {
            return 0;
        }

        $daysPassed = now()->diffInDays($this->received_at);
        return max(0, 7 - $daysPassed);
    }

    /**
     * Kiểm tra có đang trong quá trình giao hàng không
     */
    public function isInProgress(): bool
    {
        return in_array($this->shipping_status, [
            self::STATUS_PENDING,
            self::STATUS_IN_TRANSIT,
        ]);
    }

    /**
     * Kiểm tra đã hoàn thành giao hàng chưa
     */
    public function isCompleted(): bool
    {
        return in_array($this->shipping_status, [
            self::STATUS_DELIVERED,
            self::STATUS_RECEIVED,
        ]);
    }

    /**
     * Kiểm tra có đang xử lý hoàn hàng không
     */
    public function isReturning(): bool
    {
        return in_array($this->shipping_status, [
            self::STATUS_RETURN_PROCESSING,
            self::STATUS_RETURNED,
        ]);
    }

    /**
     * Lấy tên trạng thái hiển thị (tiếng Việt)
     */
    public function getStatusLabel(): string
    {
        return match($this->shipping_status) {
            self::STATUS_PENDING => 'Chờ xử lý',
            self::STATUS_NODONE => 'Chưa hoàn thành',
            self::STATUS_IN_TRANSIT => 'Đang vận chuyển',
            self::STATUS_DELIVERED => 'Đã giao hàng',
            self::STATUS_RECEIVED => 'Đã nhận hàng',
            self::STATUS_RETURN_PROCESSING => 'Đang xử lý hoàn hàng',
            self::STATUS_RETURNED => 'Đã hoàn hàng',
            self::STATUS_CANCELLED => 'Đã hủy',
            default => 'Không xác định',
        };
    }
}