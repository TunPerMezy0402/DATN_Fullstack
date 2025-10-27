<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserLike extends Model
{
    protected $table = 'user_likes';
    public $timestamps = false; // vì bảng không có created_at/updated_at mặc định
    protected $fillable = ['user_id', 'product_id', 'liked_at'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
