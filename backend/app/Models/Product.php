<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'sku',
        'category_id',
        'description',
        'origin',
        'brand',
        'image',         
        'variation_status',
    ];

    protected $casts = [
        'variation_status' => 'boolean',
        'created_at'       => 'datetime',
        'updated_at'       => 'datetime',
        'deleted_at'       => 'datetime',
    ];

    /* ==================== Relations ==================== */

    // App/Models/Product.php
public function category()
{
    return $this->belongsTo(Category::class)
        ->withDefault(['id' => null, 'name' => null])
        ->withTrashed(); // 👈 quan trọng
}


    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }

    /* ==================== Scopes ==================== */

    /**
     * Tìm theo tên/sku sản phẩm hoặc sku biến thể (giống Controller@index)
     */
    public function scopeSearch($q, ?string $term)
    {
        $s = trim((string) $term);
        if ($s === '') return $q;

        return $q->where(function ($w) use ($s) {
            $w->where('name', 'like', "%{$s}%")
              ->orWhere('sku', 'like', "%{$s}%")
              ->orWhereHas('variants', function ($v) use ($s) {
                  $v->where('sku', 'like', "%{$s}%");
              });
        });
    }

    /**
     * Lọc theo category (nullable)
     */
    public function scopeByCategory($q, $categoryId)
    {
        if ($categoryId === null || $categoryId === '') return $q;
        return $q->where('category_id', $categoryId);
    }

    /* ==================== Accessors / Mutators ==================== */

    /**
     * SKU luôn là CHUỖI (không ép số) và in hoa
     */
    public function setSkuAttribute($value): void
    {
        if ($value === null || $value === '') {
            $this->attributes['sku'] = null;
            return;
        }
        $sku = strtoupper(trim((string) $value));
        $this->attributes['sku'] = $sku;
    }

    /**
     * Chuẩn hoá khi set image: nhận string|null -> trim, rỗng thì null
     */
    public function setImageAttribute($value): void
    {
        if ($value === null) {
            $this->attributes['image'] = null;
            return;
        }
        $v = trim((string) $value);
        $this->attributes['image'] = $v !== '' ? $v : null;
    }

    /**
     * Lấy ảnh đầu tiên nhanh gọn (để tương thích chỗ code cũ có thể dùng firstImage)
     */
    public function getFirstImageAttribute(): ?string
    {
        return $this->image ?: null;
    }
}
