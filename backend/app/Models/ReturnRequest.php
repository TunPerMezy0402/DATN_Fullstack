<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class ReturnRequest extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'estimated_refund_min',
        'estimated_refund_max',
        'estimated_refund',
        'status',
        'admin_note',
        'refund_30k',
    ];

    protected $casts = [
        'refund_30k' => 'boolean',
        'estimated_refund_min' => 'decimal:2',
        'estimated_refund_max' => 'decimal:2',
        'estimated_refund' => 'decimal:2',
    ];

    const FREESHIP_THRESHOLD = 500000;
    const DEFAULT_SHIPPING_FEE = 30000;

    // ============================================================
    //                       RELATIONSHIPS
    // ============================================================

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function items()
    {
        return $this->hasMany(ReturnItem::class, 'return_request_id');
    }

    // ============================================================
    //                  METHODS REQUIRED BY CONTROLLER
    // ============================================================

    /**
     * ✅ Tính lại số tiền hoàn (được Controller gọi)
     */
    public function recalculateAmounts(): self
    {
        $order = $this->order;
        if (!$order) {
            Log::warning('ReturnRequest recalculateAmounts: Order not found', ['return_request_id' => $this->id]);
            return $this;
        }

        // Load relationships nếu chưa load
        if (!$this->relationLoaded('items')) {
            $this->load('items');
        }

        // Chỉ tính items approved/completed/pending
        $validItems = $this->items->whereNotIn('status', ['rejected']);

        if ($validItems->isEmpty()) {
            $this->update([
                'estimated_refund_min' => 0,
                'estimated_refund_max' => 0,
                'estimated_refund' => 0,
            ]);
            return $this->fresh();
        }

        // ============================================================
        // TÍNH ESTIMATED_REFUND (số tiền hoàn hiện tại)
        // ============================================================
        $totalReturnAmount = $validItems->sum('refund_amount');
        $estimatedRefund = $this->calculateRefund($totalReturnAmount);

        // ============================================================
        // TÍNH MIN: Hoàn ÍT NHẤT 1 item có giá trị THẤP NHẤT
        // ============================================================
        $minItemAmount = $validItems->min('refund_amount') ?? 0;
        $estimatedRefundMin = $this->calculateRefund($minItemAmount);

        // ============================================================
        // TÍNH MAX: Hoàn TẤT CẢ items (bao gồm cả pending)
        // ============================================================
        $maxItemAmount = $validItems->sum('refund_amount');
        $estimatedRefundMax = $this->calculateRefund($maxItemAmount);

        // ============================================================
        // CẬP NHẬT DATABASE
        // ============================================================
        $this->update([
            'estimated_refund_min' => max(0, round($estimatedRefundMin, 2)),
            'estimated_refund_max' => max(0, round($estimatedRefundMax, 2)),
            'estimated_refund' => max(0, round($estimatedRefund, 2)),
        ]);

        Log::info('ReturnRequest recalculated', [
            'return_request_id' => $this->id,
            'total_return_amount' => $totalReturnAmount,
            'min_item_amount' => $minItemAmount,
            'max_item_amount' => $maxItemAmount,
            'estimated_refund_min' => $estimatedRefundMin,
            'estimated_refund_max' => $estimatedRefundMax,
            'estimated_refund' => $estimatedRefund,
            'refund_30k' => $this->refund_30k,
        ]);

        return $this->fresh();
    }

    /**
     * ✅ Alias method để tương thích với Controller
     */
    public function recalculateRefund(): self
    {
        return $this->recalculateAmounts();
    }

    /**
     * 💰 Tính số tiền hoàn dự kiến - LOGIC ĐÚNG
     * 
     * CASE 1: Giữ coupon (remaining >= min_purchase)
     *   → Hoàn theo tỷ lệ: (actual_paid) × (return_amount / order_total)
     * 
     * CASE 2: Hủy coupon (remaining < min_purchase)
     *   → Tính lại toàn bộ: (order_total - return_amount) - actual_paid
     *   → Khách phải trả thêm (hoặc được hoàn nếu âm)
     */
    private function calculateRefund(float $returnAmount): float
    {
        $order = $this->order;
        if (!$order) return 0;

        $orderTotal = (float) $order->total_amount;
        $discount = (float) ($order->discount_amount ?? 0);
        $actualPaid = $orderTotal - $discount; // Số tiền khách đã trả

        // Số tiền còn lại sau khi hoàn
        $remainingAmount = $orderTotal - $returnAmount;

        $coupon = $order->coupon;

        // ============================================================
        // KIỂM TRA COUPON CÒN ÁP DỤNG ĐƯỢC KHÔNG
        // ============================================================
        $couponStillValid = false;
        
        if ($coupon && $discount > 0) {
            $minPurchase = (float) ($coupon->min_purchase ?? 0);
            
            if ($remainingAmount >= $minPurchase) {
                $couponStillValid = true;
            }
        }

        // ============================================================
        // TÍNH TIỀN HOÀN
        // ============================================================
        $refundForGoods = 0;

        if ($couponStillValid) {
            // ✅ CASE 1: Giữ coupon → Hoàn theo tỷ lệ
            $returnRatio = $orderTotal > 0 ? ($returnAmount / $orderTotal) : 0;
            $refundForGoods = $actualPaid * $returnRatio;

            Log::info('Calculate refund - Keep coupon', [
                'order_total' => $orderTotal,
                'discount' => $discount,
                'actual_paid' => $actualPaid,
                'return_amount' => $returnAmount,
                'remaining_amount' => $remainingAmount,
                'return_ratio' => $returnRatio,
                'refund_for_goods' => $refundForGoods,
            ]);

        } else {
            // ✅ CASE 2: Hủy coupon → Tính lại toàn bộ
            // Giá trị đơn mới (không discount) = remainingAmount
            // Khách đã trả = actualPaid
            // Khách nên trả = remainingAmount
            // Chênh lệch = actualPaid - remainingAmount
            
            $shouldPay = $remainingAmount; // Số tiền khách PHẢI TRẢ cho đơn còn lại
            $refundForGoods = $actualPaid - $shouldPay; // Số tiền shop phải HOÀN LẠI

            Log::info('Calculate refund - Cancel coupon', [
                'order_total' => $orderTotal,
                'discount' => $discount,
                'actual_paid' => $actualPaid,
                'return_amount' => $returnAmount,
                'remaining_amount' => $remainingAmount,
                'should_pay' => $shouldPay,
                'refund_for_goods' => $refundForGoods,
                'explanation' => "Khách đã trả {$actualPaid}, nhưng đơn còn lại giá gốc là {$remainingAmount}, nên hoàn = {$actualPaid} - {$remainingAmount}",
            ]);
        }

        // ============================================================
        // TÍNH PHÍ SHIP (nếu có)
        // ============================================================
        $isFreeship = $orderTotal >= self::FREESHIP_THRESHOLD;
        $shouldRefund30k = $this->refund_30k && !$isFreeship;
        $refundShipping = $shouldRefund30k ? self::DEFAULT_SHIPPING_FEE : 0;

        $totalRefund = $refundForGoods + $refundShipping;

        Log::info('Calculate refund - Final', [
            'refund_for_goods' => $refundForGoods,
            'shipping_fee' => $refundShipping,
            'total_refund' => $totalRefund,
            'coupon_still_valid' => $couponStillValid,
        ]);

        return max(0, round($totalRefund, 2));
    }

    /**
     * ✅ Đánh dấu return request hoàn thành
     */
    public function markAsCompleted($actualRefund, $adminNote = null): self
    {
        $this->update([
            'status' => 'completed',
            'admin_note' => $adminNote ?? $this->admin_note,
        ]);

        Log::info('ReturnRequest marked as completed', [
            'return_request_id' => $this->id,
        ]);

        return $this->fresh();
    }

    /**
     * ✅ Đánh dấu return request bị từ chối
     */
    public function markAsRejected($adminNote = null): self
    {
        $this->update([
            'status' => 'rejected',
            'admin_note' => $adminNote ?? $this->admin_note,
        ]);

        Log::info('ReturnRequest marked as rejected', [
            'return_request_id' => $this->id,
        ]);

        return $this->fresh();
    }

    // ============================================================
    //                       HELPER METHODS
    // ============================================================

    /**
     * Kiểm tra có phải hoàn toàn bộ đơn hàng không
     */
    public function isFullReturn(): bool
    {
        $order = $this->order;
        if (!$order) return false;

        $allOrderItems = $order->items;
        $returnedItems = $this->items->whereNotIn('status', ['rejected']);

        $totalOrderQuantity = $allOrderItems->sum('quantity');
        $totalReturnQuantity = $returnedItems->sum('quantity');

        return $totalReturnQuantity >= $totalOrderQuantity;
    }

    /**
     * Kiểm tra có thể hoàn 30k không
     */
    public function canRefund30k(): bool
    {
        $order = $this->order;
        if (!$order) return false;

        // Đơn >= 500k đã freeship
        if ((float) $order->total_amount >= self::FREESHIP_THRESHOLD) {
            return false;
        }

        // Đã hoàn rồi
        if ($this->refund_30k === true) {
            return false;
        }

        return true;
    }

    /**
     * Tổng số lượng items
     */
    public function getTotalItemsCount(): int
    {
        return $this->items()->sum('quantity');
    }

    /**
     * Tổng giá trị hàng hoàn
     */
    public function getTotalReturnAmount(): float
    {
        $validItems = $this->items->whereNotIn('status', ['rejected']);
        return floatval($validItems->sum('refund_amount'));
    }

    /**
     * Label hiển thị trạng thái hoàn 30k
     */
    public function getRefund30kLabel(): string
    {
        $order = $this->order;
        if (!$order) return 'N/A';

        $orderTotal = floatval($order->total_amount);
        $isFreeship = $orderTotal >= self::FREESHIP_THRESHOLD;

        if ($isFreeship) {
            return 'Không áp dụng (đơn >= 500k, đã freeship)';
        }

        return $this->refund_30k ? 'Có hoàn 30k ship' : 'Không hoàn ship';
    }

    /**
     * Giải thích chi tiết cách tính refund
     */
    public function getRefundExplanation(): string
    {
        $order = $this->order;
        if (!$order) return '';

        $orderTotal = floatval($order->total_amount);
        $discount = floatval($order->discount_amount ?? 0);
        $actualPaid = $orderTotal - $discount;
        $isFreeship = $orderTotal >= self::FREESHIP_THRESHOLD;

        $validItems = $this->items->whereNotIn('status', ['rejected']);
        $totalReturnAmount = $validItems->sum('refund_amount');
        $remainingAmount = $orderTotal - $totalReturnAmount;

        $coupon = $order->coupon;
        $couponStillValid = false;

        if ($coupon && $discount > 0) {
            $minPurchase = (float) ($coupon->min_purchase ?? 0);
            if ($remainingAmount >= $minPurchase) {
                $couponStillValid = true;
            }
        }

        $returnRatio = $orderTotal > 0 ? ($totalReturnAmount / $orderTotal) * 100 : 0;
        $shouldRefund30k = $this->refund_30k && !$isFreeship;

        if ($couponStillValid) {
            // Giữ coupon
            if ($shouldRefund30k) {
                return sprintf(
                    "💰 Hoàn %.2f%% tiền đã trả (%.0fđ) + 30k ship",
                    $returnRatio,
                    $actualPaid * ($totalReturnAmount / $orderTotal)
                );
            }
            return sprintf(
                "💰 Hoàn %.2f%% tiền đã trả (%.0fđ)",
                $returnRatio,
                $actualPaid * ($totalReturnAmount / $orderTotal)
            );
        } else {
            // Hủy coupon - tính lại
            $shouldPay = $remainingAmount;
            $refund = $actualPaid - $shouldPay;
            
            if ($shouldRefund30k) {
                return sprintf(
                    "⚠️ Hủy mã giảm giá. Khách đã trả %.0fđ, đơn còn %.0fđ → Hoàn %.0fđ + 30k ship",
                    $actualPaid,
                    $shouldPay,
                    $refund
                );
            }
            return sprintf(
                "⚠️ Hủy mã giảm giá. Khách đã trả %.0fđ, đơn còn %.0fđ → Hoàn %.0fđ",
                $actualPaid,
                $shouldPay,
                $refund
            );
        }
    }

    /**
     * 📊 Tính cả 2 kịch bản để hiển thị (Có/Không hoàn 30k)
     */
    public function calculateBothScenarios(): array
    {
        $validItems = $this->items->whereNotIn('status', ['rejected']);
        $totalReturnAmount = $validItems->sum('refund_amount');

        $originalRefund30k = $this->refund_30k;

        // Kịch bản 1: KHÔNG hoàn 30k
        $this->refund_30k = false;
        $withoutRefund30k = $this->calculateRefund($totalReturnAmount);

        // Kịch bản 2: CÓ hoàn 30k
        $this->refund_30k = true;
        $withRefund30k = $this->calculateRefund($totalReturnAmount);

        // Khôi phục giá trị gốc
        $this->refund_30k = $originalRefund30k;

        $order = $this->order;
        $isFullReturn = $this->isFullReturn();

        $orderTotal = floatval($order->total_amount);
        $discount = floatval($order->discount_amount ?? 0);
        $actualPaid = $orderTotal - $discount;
        $isFreeship = $orderTotal >= self::FREESHIP_THRESHOLD;

        $remainingAmount = $orderTotal - $totalReturnAmount;
        $coupon = $order->coupon;
        $couponStillValid = false;

        if ($coupon && $discount > 0) {
            $minPurchase = (float) ($coupon->min_purchase ?? 0);
            if ($remainingAmount >= $minPurchase) {
                $couponStillValid = true;
            }
        }

        $returnRatio = $orderTotal > 0 ? ($totalReturnAmount / $orderTotal) * 100 : 0;

        // Mô tả chi tiết
        $description = $couponStillValid
            ? sprintf('Hoàn %.2f%% tiền đã trả (%.0fđ)', $returnRatio, $actualPaid * ($totalReturnAmount / $orderTotal))
            : sprintf('Hủy coupon. Khách trả %.0fđ, còn %.0fđ → Hoàn %.0fđ', 
                $actualPaid, 
                $remainingAmount, 
                $actualPaid - $remainingAmount
            );

        return [
            'return_amount' => $totalReturnAmount,
            'remaining_amount' => $remainingAmount,
            'is_full_return' => $isFullReturn,
            'return_ratio' => round($returnRatio, 2),
            'coupon_still_valid' => $couponStillValid,
            'order_info' => [
                'total_before_discount' => $orderTotal,
                'discount' => $discount,
                'actual_paid' => $actualPaid,
                'shipping_fee' => floatval($order->shipping_fee ?? self::DEFAULT_SHIPPING_FEE),
                'is_freeship' => $isFreeship,
                'coupon_min_purchase' => $coupon ? (float) ($coupon->min_purchase ?? 0) : 0,
            ],
            'scenarios' => [
                'without_30k' => [
                    'amount' => $withoutRefund30k,
                    'label' => 'Không hoàn ship',
                    'description' => $description,
                    'formatted' => number_format($withoutRefund30k, 0, ',', '.') . 'đ',
                ],
                'with_30k' => [
                    'amount' => $withRefund30k,
                    'label' => 'Có hoàn 30k ship',
                    'description' => !$isFreeship
                        ? ($description . ' + 30k ship')
                        : 'Đơn hàng >= 500k (đã freeship), không áp dụng hoàn 30k',
                    'formatted' => number_format($withRefund30k, 0, ',', '.') . 'đ',
                    'applicable' => !$isFreeship,
                ],
            ],
            'difference' => abs($withRefund30k - $withoutRefund30k),
            'difference_formatted' => number_format(abs($withRefund30k - $withoutRefund30k), 0, ',', '.') . 'đ',
            'refund_30k_enabled' => $originalRefund30k,
        ];
    }

    /**
     * Chi tiết refund
     */
    public function getRefundDetails(): array
    {
        $order = $this->order;
        $totalReturnAmount = $this->getTotalReturnAmount();

        $orderTotal = floatval($order->total_amount);
        $discount = floatval($order->discount_amount ?? 0);
        $actualPaid = $orderTotal - $discount;
        $shippingFee = floatval($order->shipping_fee ?? self::DEFAULT_SHIPPING_FEE);

        $remainingAmount = $orderTotal - $totalReturnAmount;
        $coupon = $order->coupon;
        $couponStillValid = false;

        if ($coupon && $discount > 0) {
            $minPurchase = (float) ($coupon->min_purchase ?? 0);
            if ($remainingAmount >= $minPurchase) {
                $couponStillValid = true;
            }
        }

        return [
            'order_total' => $orderTotal,
            'order_discount' => $discount,
            'actual_paid' => $actualPaid,
            'order_shipping_fee' => $shippingFee,
            'is_freeship' => $orderTotal >= self::FREESHIP_THRESHOLD,
            'is_full_return' => $this->isFullReturn(),

            'return_amount' => $totalReturnAmount,
            'remaining_amount' => $remainingAmount,
            'return_ratio' => $orderTotal > 0 ? ($totalReturnAmount / $orderTotal) * 100 : 0,

            'coupon_still_valid' => $couponStillValid,
            'coupon_min_purchase' => $coupon ? (float) ($coupon->min_purchase ?? 0) : 0,

            'refund_30k' => $this->refund_30k,
            'refund_30k_label' => $this->refund_30k ? 'Có hoàn 30k ship' : 'Không hoàn ship',

            'estimated_refund' => floatval($this->estimated_refund),
            'estimated_refund_min' => floatval($this->estimated_refund_min),
            'estimated_refund_max' => floatval($this->estimated_refund_max),

            'explanation' => $this->getRefundExplanation(),
            'scenarios' => $this->calculateBothScenarios(),
        ];
    }
}   