<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    public $timestamps = false; // bảng dùng comment_time thay vì timestamps mặc định

    protected $fillable = [
        'user_name', 'product_id', 'comment', 'parent_id', 'comment_time',
    ];

    protected $casts = [
        'comment_time' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function parent()
    {
        return $this->belongsTo(ProductReview::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(ProductReview::class, 'parent_id');
    }
}
