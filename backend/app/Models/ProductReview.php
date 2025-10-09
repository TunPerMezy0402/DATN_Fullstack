<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    protected $table = 'product_reviews';

    public $timestamps = false; // vì bạn có trường comment_time riêng

    protected $fillable = [
        'user_name',
        'product_id',
        'comment',
        'parent_id',
        'comment_time',
    ];

    // Quan hệ với sản phẩm
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Quan hệ với comment cha
    public function parent()
    {
        return $this->belongsTo(ProductReview::class, 'parent_id');
    }

    // Quan hệ với các comment con
    public function replies()
    {
        return $this->hasMany(ProductReview::class, 'parent_id');
    }
}
