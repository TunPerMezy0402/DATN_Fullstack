<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attribute extends Model
{
    use HasFactory;

    protected $table = 'attributes';
    protected $primaryKey = 'id';
    public $timestamps = true; // Bảo đảm có created_at và updated_at

    protected $fillable = [
        'type',
        'value',
        'is_deleted',
    ];

    protected $casts = [
        'is_deleted' => 'boolean',
    ];

    /**
     * Scope: lấy các bản ghi chưa xóa mềm
     */
    public function scopeActive($query)
    {
        return $query->where('is_deleted', 0);
    }

    /**
     * Scope: lấy các bản ghi đã xóa mềm
     */
    public function scopeTrashed($query)
    {
        return $query->where('is_deleted', 1);
    }

    /**
     * Hàm tiện ích: xóa mềm
     */
    public function softDelete()
    {
        $this->update(['is_deleted' => 1]);
    }

    /**
     * Hàm tiện ích: khôi phục dữ liệu đã xóa mềm
     */
    public function restoreData()
    {
        $this->update(['is_deleted' => 0]);
    }

    /**
     * Hàm kiểm tra đã bị xóa mềm chưa
     */
    public function isDeleted()
    {
        return $this->is_deleted === 1;
    }
}
