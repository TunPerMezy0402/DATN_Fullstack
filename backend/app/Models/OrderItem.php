<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'variant_id',
        'product_name',
        'product_image',
        'quantity',
        'price',
        'size',
        'color',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price' => 'decimal:2',
    ];

    // ============================================================
    //                         RELATIONSHIPS
    // ============================================================

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * ✅ Relationship với ReturnItem
     * Để hỗ trợ Eager Loading: $orderItem->returnItems
     */
    public function returnItems()
    {
        return $this->hasMany(ReturnItem::class, 'order_item_id');
    }

    /**
     * ⚠️ KHÔNG thể dùng relationship vì ProductReview dùng composite key
     * (order_id, product_id, variant_id) thay vì order_item_id
     * 
     * Chỉ có thể query thủ công trong getReviews()
     */

    // ============================================================
    //                    COMPUTED ATTRIBUTES
    // ============================================================

    /**
     * ⚡ Tính returned quantity (Query mỗi lần gọi)
     * ⚠️ Không nên dùng trong vòng lặp - dùng getReturnedQtyFromLoaded() thay thế
     */
    public function getReturnedQty(): int
    {
        return $this->returnItems()
            ->whereIn('status', ['pending', 'approved', 'completed'])
            ->sum('quantity');
    }

    /**
     * ✅ Tính returned quantity từ dữ liệu đã eager load
     * Dùng khi đã load relationship: ->with('returnItems')
     */
    public function getReturnedQtyFromLoaded(): int
    {
        if (!$this->relationLoaded('returnItems')) {
            return $this->getReturnedQty();
        }

        return $this->returnItems
            ->whereIn('status', ['pending', 'approved', 'completed'])
            ->sum('quantity');
    }

    /**
     * ⚡ Số lượng có thể hoàn trả
     * ⚠️ Không nên dùng trong vòng lặp - dùng availableReturnQuantityFromLoaded() thay thế
     */
    public function availableReturnQuantity(): int
    {
        return max(0, $this->quantity - $this->getReturnedQty());
    }

    /**
     * ✅ Số lượng có thể hoàn trả (từ dữ liệu đã load)
     */
    public function availableReturnQuantityFromLoaded(): int
    {
        return max(0, $this->quantity - $this->getReturnedQtyFromLoaded());
    }

    // ============================================================
    //                    BUSINESS LOGIC
    // ============================================================

    /**
     * Kiểm tra có thể trả hàng không
     */
    public function canReturn(): bool
    {
        return $this->availableReturnQuantity() > 0 && !$this->hasReview();
    }

    /**
     * ⚡ Kiểm tra đã review chưa
     * NOTE: ProductReview dùng composite key (order_id, product_id, variant_id)
     */
    public function hasReview(): bool
    {
        return ProductReview::where('order_id', $this->order_id)
            ->where('product_id', $this->product_id)
            ->where('variant_id', $this->variant_id)
            ->exists();
    }

    /**
     * ⚡ Lấy danh sách review của item
     * NOTE: ProductReview dùng composite key (order_id, product_id, variant_id)
     */
    public function getReviews()
    {
        return ProductReview::where('order_id', $this->order_id)
            ->where('product_id', $this->product_id)
            ->where('variant_id', $this->variant_id)
            ->orderBy('comment_time', 'desc')
            ->get();
    }

    // ============================================================
    //                    QUERY SCOPES
    // ============================================================

    /**
     * Scope: Chỉ lấy items có thể hoàn trả
     */
    public function scopeReturnable($query)
    {
        return $query->whereHas('order.shipping', function ($q) {
            $q->where('shipping_status', 'received')
              ->where('received_at', '>=', now()->subDays(7));
        });
    }

    /**
     * Scope: Eager load chỉ returnItems (reviews không thể eager load)
     */
    public function scopeWithReturnData($query)
    {
        return $query->with([
            'returnItems:id,order_item_id,quantity,status'
        ]);
    }
}