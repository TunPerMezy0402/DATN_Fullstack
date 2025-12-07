<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    public $timestamps = false; // bảng dùng comment_time thay vì timestamps mặc định

    protected $fillable = [
        'user_id',
        'product_id',
        'variant_id', 
        'order_id',
        'rating',       
        'comment',
        'comment_time',
    ];

    protected $casts = [
        'comment_time' => 'datetime',
    ];

    /**
     * Relationship với Product
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Relationship với User
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relationship với Order
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}