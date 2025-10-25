<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'product_id', 'size_id', 'color_id', 'image', 'images', 'sku',
        'price', 'discount_price', 'quantity_sold', 'stock_quantity', 'is_available',
    ];

    protected $casts = [
        'images'          => 'array',
        'price'           => 'decimal:2',
        'discount_price'  => 'decimal:2',
        'quantity_sold'   => 'integer',
        'stock_quantity'  => 'integer',
        'is_available'    => 'boolean',
        'created_at'      => 'datetime',
        'updated_at'      => 'datetime',
        'deleted_at'      => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Alias quan hệ đến attributes theo vai trò
    public function size()
    {
        return $this->belongsTo(Attribute::class, 'size_id');
    }

    public function color()
    {
        return $this->belongsTo(Attribute::class, 'color_id');
    }
}
