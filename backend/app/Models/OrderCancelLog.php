<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OrderCancelLog extends Model
{
    use HasFactory;

    protected $table = 'order_cancel_logs';

    protected $fillable = [
        'order_id',
        'cancelled_by',     // 'user', 'admin', 'system'
        'reason',           // Lý do hủy/hoàn
        'note',             // Ghi chú thêm (có thể chứa JSON data)
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public $timestamps = false;

    // ============================================================
    //                         CONSTANTS
    // ============================================================
    
    const CANCELLED_BY_USER = 'user';
    const CANCELLED_BY_ADMIN = 'admin';
    const CANCELLED_BY_SYSTEM = 'system';

    // ============================================================
    //                         RELATIONSHIPS
    // ============================================================

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    // ============================================================
    //                         SCOPES
    // ============================================================

    public function scopeByUser($query)
    {
        return $query->where('cancelled_by', self::CANCELLED_BY_USER);
    }

    public function scopeByAdmin($query)
    {
        return $query->where('cancelled_by', self::CANCELLED_BY_ADMIN);
    }

    public function scopeBySystem($query)
    {
        return $query->where('cancelled_by', self::CANCELLED_BY_SYSTEM);
    }

    // ============================================================
    //                         METHODS
    // ============================================================

    /**
     * Tạo log hủy đơn
     */
    public static function createLog(
        int $orderId,
        string $cancelledBy,
        string $reason,
        string $note = null
    ): self {
        return self::create([
            'order_id' => $orderId,
            'cancelled_by' => $cancelledBy,
            'reason' => $reason,
            'note' => $note,
            'created_at' => now(),
        ]);
    }

    /**
     * Tạo log hủy bởi user
     */
    public static function createUserCancelLog(
        int $orderId,
        string $reason,
        string $note = null
    ): self {
        return self::createLog($orderId, self::CANCELLED_BY_USER, $reason, $note);
    }

    /**
     * Tạo log hủy bởi admin
     */
    public static function createAdminCancelLog(
        int $orderId,
        string $reason,
        string $note = null
    ): self {
        return self::createLog($orderId, self::CANCELLED_BY_ADMIN, $reason, $note);
    }

    /**
     * Tạo log hoàn hàng (user)
     */
    public static function createReturnLog(
        int $orderId,
        array $returnData
    ): self {
        return self::create([
            'order_id' => $orderId,
            'cancelled_by' => self::CANCELLED_BY_USER,
            'reason' => "Yêu cầu hoàn " . count($returnData['returned_items']) . " sản phẩm",
            'note' => json_encode($returnData, JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
        ]);
    }

    /**
     * Parse note từ JSON
     */
    public function getParsedNote(): ?array
    {
        if (!$this->note) {
            return null;
        }

        $decoded = json_decode($this->note, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Kiểm tra có phải log hoàn hàng không
     */
    public function isReturnLog(): bool
    {
        return str_contains($this->reason, 'hoàn') && $this->getParsedNote() !== null;
    }

    /**
     * Lấy chi tiết hoàn hàng từ note
     */
    public function getReturnDetails(): ?array
    {
        if (!$this->isReturnLog()) {
            return null;
        }

        return $this->getParsedNote();
    }
}