<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShippingLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'shipping_id',
        'old_status',
        'new_status',
        'created_at', // Thêm vào fillable
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Quan hệ ngược với Shipping
     */
    public function shipping()
    {
        return $this->belongsTo(Shipping::class, 'shipping_id');
    }
}
