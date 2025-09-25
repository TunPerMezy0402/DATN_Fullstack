<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    protected $table = 'support_tickets';

    protected $fillable = [
        'user_id',
        'subject',
        'message',
        'status',
    ];

    // Nếu có quan hệ với User
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
