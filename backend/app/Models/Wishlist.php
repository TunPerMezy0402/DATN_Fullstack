<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    protected $table = 'wishlists';

    protected $fillable = [
        'user_id',
        'products', // Có thể lưu JSON danh sách product_id
    ];

    // Nếu có quan hệ với User
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
