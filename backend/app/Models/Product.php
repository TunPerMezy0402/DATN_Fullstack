<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    // Tên bảng
    protected $table = 'products';

    // Các cột có thể fill dữ liệu
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
        'is_deleted',
    ];
}
