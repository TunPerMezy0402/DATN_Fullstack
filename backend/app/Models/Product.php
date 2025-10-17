<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Product extends Model
{
    use HasFactory;

    protected $table = 'products';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'name',
        'category_id',
        'description',
        'origin',
        'brand',
        'price',
        'stock_quantity',
        'images',
        'discount_price',
        'variation_status',
        'deleted_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_price' => 'decimal:2',
        'deleted_at' => 'datetime',
    ];

    /**
     * Scope: chỉ lấy sản phẩm chưa xóa mềm
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope: chỉ lấy sản phẩm đã xóa mềm
     */
    public function scopeTrashed($query)
    {
        return $query->whereNotNull('deleted_at');
    }

    /**
     * Xóa mềm sản phẩm
     */
    public function softDelete()
    {
        $this->update(['deleted_at' => Carbon::now()]);
    }

    /**
     * Khôi phục sản phẩm đã xóa mềm
     */
    public function restoreData()
    {
        $this->update(['deleted_at' => null]);
    }

    /**
     * Kiểm tra sản phẩm đã bị xóa mềm chưa
     */
    public function isDeleted()
    {
        return !is_null($this->deleted_at);
    }

    /**
     * Quan hệ: 1 sản phẩm thuộc về 1 danh mục
     */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id', 'id');
    }

    /**
     * Quan hệ: 1 sản phẩm có nhiều biến thể (variants)
     */
    public function variants()
    {
        return $this->hasMany(ProductVariant::class, 'product_id', 'id');
    }
}
