<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ReturnRequest extends Model
{
    use HasFactory;

    protected $table = 'return_requests';

    protected $fillable = [
        'order_id',
        'user_id',
        'status',
        'total_return_amount',      // Tổng tiền hàng hoàn
        'refunded_discount',        // Giảm giá được hoàn
        'old_shipping_fee',         // Phí ship cũ
        'new_shipping_fee',         // Phí ship mới
        'shipping_diff',            // Chênh lệch phí ship
        'estimated_refund',         // Số tiền hoàn dự kiến
        'actual_refund',            // Số tiền hoàn thực tế (sau khi admin xác nhận)
        'remaining_amount',         // Số tiền đơn còn lại
        'requested_at',
        'processed_at',
        'rejected_at',
        'note',
        'admin_note',               // Ghi chú của admin
    ];

    protected $casts = [
        'total_return_amount' => 'decimal:2',
        'refunded_discount' => 'decimal:2',
        'old_shipping_fee' => 'decimal:2',
        'new_shipping_fee' => 'decimal:2',
        'shipping_diff' => 'decimal:2',
        'estimated_refund' => 'decimal:2',
        'actual_refund' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'processed_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public $timestamps = false;

    // ============================================================
    //                         CONSTANTS
    // ============================================================

    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_REJECTED = 'rejected';

    // ============================================================
    //                         RELATIONSHIPS
    // ============================================================

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function items()
    {
        return $this->hasMany(ReturnItem::class, 'return_request_id');
    }

    // ============================================================
    //                         SCOPES
    // ============================================================

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function restoreStock(): void
    {
        foreach ($this->items as $returnItem) {
            if ($returnItem->status === ReturnItem::STATUS_COMPLETED && $returnItem->variant) {
                $returnItem->variant->increment('stock_quantity', $returnItem->quantity);
                $returnItem->variant->decrement('quantity_sold', $returnItem->quantity);

                Log::info("Stock restored", [
                    'variant_id' => $returnItem->variant->id,
                    'quantity' => $returnItem->quantity,
                    'return_request_id' => $this->id,
                ]);
            }
        }
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', self::STATUS_PROCESSING);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    // ============================================================
    //                         METHODS
    // ============================================================

    /**
     * Kiểm tra có thể xử lý không
     */
    public function canProcess(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Kiểm tra có thể hoàn thành không
     */
    public function canComplete(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }

    /**
     * Kiểm tra có thể từ chối không
     */
    public function canReject(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }

    /**
     * Đánh dấu đang xử lý
     */
    public function markAsProcessing(): bool
    {
        if (!$this->canProcess()) {
            return false;
        }

        return $this->update(['status' => self::STATUS_PROCESSING]);
    }

    /**
     * Hoàn thành yêu cầu hoàn hàng
     */
    public function markAsCompleted(float $actualRefund = null, string $adminNote = null): bool
    {
        if (!$this->canComplete()) {
            return false;
        }

        return $this->update([
            'status' => self::STATUS_COMPLETED,
            'actual_refund' => $actualRefund ?? $this->estimated_refund,
            'processed_at' => now(),
            'admin_note' => $adminNote,
        ]);
    }

    /**
     * Từ chối yêu cầu hoàn hàng
     */
    public function markAsRejected(string $adminNote = null): bool
    {
        if (!$this->canReject()) {
            return false;
        }

        return $this->update([
            'status' => self::STATUS_REJECTED,
            'rejected_at' => now(),
            'admin_note' => $adminNote,
        ]);
    }

    /**
     * Lấy tổng số sản phẩm hoàn
     */
    public function getTotalItemsCount(): int
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Kiểm tra có hoàn toàn bộ đơn hàng không
     */
    public function isFullReturn(): bool
    {
        return $this->remaining_amount <= 0;
    }
}