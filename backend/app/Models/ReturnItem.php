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
        'images',
        'status',
        'admin_response',
        'refund_amount',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'images' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
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
        return $this->belongsTo(OrderItem::class, 'order_item_id');
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
    public function markAsApproved(float $refundAmount = null, string $adminResponse = null): bool
    {
        if (!$this->canApprove()) {
            return false;
        }

        $data = [
            'status' => self::STATUS_APPROVED,
            'admin_response' => $adminResponse,
        ];

        if ($refundAmount !== null) {
            $data['refund_amount'] = $refundAmount;
        }

        $result = $this->update($data);

        // Tự động tính lại refund của return request
        if ($result) {
            $this->returnRequest->recalculateRefund();
        }

        return $result;
    }

    /**
     * Đánh dấu bị từ chối
     */
    public function markAsRejected(string $adminResponse = null): bool
    {
        if (!$this->canReject()) {
            return false;
        }

        $result = $this->update([
            'status' => self::STATUS_REJECTED,
            'admin_response' => $adminResponse,
            'refund_amount' => 0,
        ]);


        if ($result) {
            $this->returnRequest->recalculateRefund();
        }

        return $result;
    }


    public function markAsCompleted(): bool
    {
        if ($this->status !== self::STATUS_APPROVED) {
            return false;
        }

        return $this->update(['status' => self::STATUS_COMPLETED]);
    }

    /**
     * Lấy danh sách ảnh
     */
    public function getImages(): array
    {
        return $this->images ?? [];
    }

    /**
     * Thêm ảnh
     */
    public function addImage(string $imagePath): bool
    {
        $images = $this->getImages();
        $images[] = $imagePath;
        
        return $this->update(['images' => $images]);
    }

    /**
     * Xóa ảnh
     */
    public function removeImage(string $imagePath): bool
    {
        $images = $this->getImages();
        $images = array_filter($images, fn($img) => $img !== $imagePath);
        
        return $this->update(['images' => array_values($images)]);
    }
}