<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attribute extends Model
{
    use HasFactory;

    protected $table = 'attributes';
    protected $primaryKey = 'id';

    protected $fillable = [
        'type',
        'value',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    /**
     * Scope: lấy dữ liệu chưa xóa mềm
     */
    public function scopeActive($query)
    {
        return $query->where('is_deleted', 0);
    }

    /**
     * Scope: lấy dữ liệu đã xóa mềm
     */
    public function scopeDeleted($query)
    {
        return $query->where('is_deleted', 1);
    }
}
