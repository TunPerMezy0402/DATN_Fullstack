<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'chat_room_id',
        'sender_id',
        'sender_type',  // 'user', 'agent', hoặc 'admin'
        'content',
        'attachment',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public $timestamps = true;

    /**
     * Phòng chat chứa tin nhắn
     */
    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class);
    }

    /**
     * Người gửi tin nhắn
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Scope: Tin nhắn chưa đọc từ user
     */
    public function scopeUnreadFromUser($query)
    {
        return $query->where('sender_type', 'user')
            ->where('is_read', false);
    }

    /**
     * Scope: Tin nhắn từ agent/admin
     */
    public function scopeFromSupport($query)
    {
        return $query->whereIn('sender_type', ['agent', 'admin']);
    }
}
