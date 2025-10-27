<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipping extends Model
{
    protected $table = 'shipping';

    protected $fillable = [
        'order_id', 'shipping_name', 'shipping_phone', 'shipping_address_line',
        'shipping_city', 'shipping_province', 'shipping_postal_code',
        'carrier', 'tracking_number', 'shipping_status', 'estimated_delivery', 'delivered_at'
    ];

    public $timestamps = false;

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
