<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    protected $table = 'cart_items';

    protected $fillable = [
        'cart_id',
        'variant_id',
        'quantity',
    ];

    public $timestamps = false;

    // 🔗 Quan hệ ngược lại với Cart
    public function cart()
    {
        return $this->belongsTo(Cart::class, 'cart_id');
    }

    // 🔗 Quan hệ với ProductVariant
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
