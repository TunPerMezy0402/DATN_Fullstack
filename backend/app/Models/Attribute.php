<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attribute extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'attributes';
    protected $primaryKey = 'id';
    public $timestamps = true;

    protected $fillable = [
        'type',
        'value',
        'deleted_at',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];


    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }

    public function scopeTrashed($query)
    {
        return $query->whereNotNull('deleted_at');
    }

    public function softDelete()
    {
        $this->delete();
    }

    public function restoreData()
    {
        $this->restore();
    }

    public function isDeleted()
    {
        return $this->trashed();
    }
}
