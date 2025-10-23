<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attribute extends Model
{
    use SoftDeletes;

    protected $table = 'attributes';

    protected $fillable = [
        'type', 'value',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Scopes tiện lọc theo type
    public function scopeColors($q) { return $q->where('type', 'color'); }
    public function scopeSizes($q)  { return $q->where('type', 'size'); }

    // Biến thể dùng attribute làm size/color
    public function asSizeVariants()
    {
        return $this->hasMany(ProductVariant::class, 'size_id');
    }

    public function asColorVariants()
    {
        return $this->hasMany(ProductVariant::class, 'color_id');
    }
}
