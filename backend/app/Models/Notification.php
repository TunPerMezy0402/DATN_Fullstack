<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = ['user_id', 'title', 'message', 'related_chat_room_id', 'is_read'];
    protected $casts = ['is_read' => 'boolean'];
    public $timestamps = true;

    // User nhận thông báo
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Liên kết phòng chat nếu có
    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class, 'related_chat_room_id');
    }
}
