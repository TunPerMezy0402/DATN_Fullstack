<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    public $timestamps = false;
    
    protected $table = 'product_reviews'; // Đảm bảo đúng tên bảng

    protected $fillable = [
        'user_id',
        'product_id',
        'variant_id', 
        'order_id',
        'rating',       
        'comment',
        'comment_time',
        'is_approved',
    ];

    protected $casts = [
        'comment_time' => 'datetime',
        'is_approved' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id', 'id');
    }
}
