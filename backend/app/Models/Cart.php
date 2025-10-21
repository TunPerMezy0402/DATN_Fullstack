<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'carts';

    public $timestamps = true;

    protected $fillable = [
        'user_id',
    ];

    // Quan hệ với User
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
