<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_variant_id',
        'quantity',
        'price',
    ];

    // ✅ Mỗi order item thuộc về một đơn hàng
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // ✅ Mỗi order item thuộc về một biến thể sản phẩm
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}
