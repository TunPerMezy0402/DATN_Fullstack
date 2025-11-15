<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Shipping extends Model
{
    use HasFactory;

    protected $table = 'shipping';

    protected $fillable = [
        'order_id',
        'sku',
        'shipping_name',
        'shipping_phone',
        'shipping_status',
        'city',
        'district',
        'commune',
        'village',
        'notes',
    ];

    public $timestamps = false;

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
