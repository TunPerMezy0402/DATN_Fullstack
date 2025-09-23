<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    // Tên bảng (nếu không khai báo thì Laravel tự động lấy dạng số nhiều "categories")
    protected $table = 'categories';

    // Khóa chính
    protected $primaryKey = 'id';

    // Các cột có thể gán (fillable)
    protected $fillable = [
        'name',
        'description',
        'is_deleted',
    ];


    // Quan hệ: 1 danh mục có nhiều sản phẩm
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id', 'id');
    }
}
