<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Category extends Model
{
    use HasFactory;

    protected $table = 'categories';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'name',
        'description',
        'deleted_at',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    /**
     * Scope: lấy danh mục chưa bị xóa mềm
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    /**
     * Scope: lấy danh mục đã xóa mềm
     */
    public function scopeTrashed($query)
    {
        return $query->whereNotNull('deleted_at');
    }

    /**
     * Xóa mềm danh mục
     */
    public function softDelete()
    {
        $this->update(['deleted_at' => Carbon::now()]);
    }

    /**
     * Khôi phục danh mục đã xóa mềm
     */
    public function restoreData()
    {
        $this->update(['deleted_at' => null]);
    }

    /**
     * Kiểm tra danh mục đã bị xóa mềm chưa
     */
    public function isDeleted()
    {
        return !is_null($this->deleted_at);
    }

    /**
     * Quan hệ: 1 danh mục có nhiều sản phẩm
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'id');
    }
}
