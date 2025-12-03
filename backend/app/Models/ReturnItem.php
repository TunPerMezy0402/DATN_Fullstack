<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReturnItem extends Model
{
    use HasFactory;

    protected $table = 'return_items';

    protected $fillable = [
        'return_request_id',
        'order_item_id',
        'variant_id',
        'quantity',
        'reason',
        'status',
        'refund_amount',     // ✅ ĐÃ THÊM
        'admin_response',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2', // ✅ ĐÃ THÊM
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_COMPLETED = 'completed';

    protected $attributes = [
        'status' => self::STATUS_PENDING,
    ];

    // ============================================================
    //                         RELATIONSHIPS
    // ============================================================

    public function returnRequest()
    {
        return $this->belongsTo(ReturnRequest::class, 'return_request_id');
    }

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    // ============================================================
    //                         METHODS
    // ============================================================

    /**
     * Kiểm tra có thể duyệt không
     */
    public function canApprove(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Kiểm tra có thể từ chối không
     */
    public function canReject(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Đánh dấu đã duyệt
     */
    public function markAsApproved(string $adminResponse = null): bool
    {
        if (!$this->canApprove()) {
            return false;
        }

        return $this->update([
            'status' => self::STATUS_APPROVED,
            'admin_response' => $adminResponse,
        ]);
    }

    /**
     * Đánh dấu bị từ chối
     */
    public function markAsRejected(string $adminResponse = null): bool
    {
        if (!$this->canReject()) {
            return false;
        }

        return $this->update([
            'status' => self::STATUS_REJECTED,
            'admin_response' => $adminResponse,
        ]);
    }

    /**
     * Đánh dấu hoàn thành
     */
    public function markAsCompleted(): bool
    {
        return $this->update(['status' => self::STATUS_COMPLETED]);
    }
}