<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ProductVariant extends Model
{
    use HasFactory;

    protected $table = 'product_variants';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'product_id',
        'size_id',
        'color_id',
        'image',
        'images',
        'sku',
        'price',
        'discount_price',
        'stock_quantity',
        'is_available',
        'deleted_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'is_available' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    /**
     * Scope: lấy các biến thể chưa bị xóa mềm
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope: lấy các biến thể đã xóa mềm
     */
    public function scopeTrashed($query)
    {
        return $query->whereNotNull('deleted_at');
    }

    /**
     * Xóa mềm variant
     */
    public function softDelete()
    {
        $this->update(['deleted_at' => Carbon::now()]);
    }

    /**
     * Khôi phục variant đã xóa mềm
     */
    public function restoreData()
    {
        $this->update(['deleted_at' => null]);
    }

    /**
     * Kiểm tra variant đã bị xóa mềm chưa
     */
    public function isDeleted()
    {
        return !is_null($this->deleted_at);
    }

    /**
     * Quan hệ: variant thuộc về một sản phẩm
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'id');
    }
}
