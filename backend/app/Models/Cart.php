<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'carts';

    protected $fillable = [
        'user_id',
    ];

    // Laravel tự động quản lý cột updated_at, không có created_at
    public $timestamps = false;

    // Ghi đè để Laravel vẫn cập nhật updated_at
    const UPDATED_AT = 'updated_at';
    const CREATED_AT = null;

    // 🔗 Quan hệ với User
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // 🔗 Quan hệ 1-n với CartItem
    public function items()
    {
        return $this->hasMany(CartItem::class, 'cart_id');
    }
}
