<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddressBook extends Model
{
    use HasFactory;

    protected $table = 'address_book';
    protected $fillable = [
        'user_id',
        'recipient_name',
        'phone',
        'city',
        'district',
        'commune',
        'village',
        'notes',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Giới hạn 3 địa chỉ
    protected static function booted()
    {
        static::creating(function ($address) {
            $count = static::where('user_id', $address->user_id)->count();
            if ($count >= 3) {
                throw new \Exception('Bạn chỉ có thể thêm tối đa 3 địa chỉ.');
            }
        });
    }
}
