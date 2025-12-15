<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatRoom extends Model
{
    protected $fillable = [
        'user_id',
        'assigned_to',
        'status',
        'subject',
        'closed_at',
        'rating',      // ✅ Thêm mới
        'feedback',    // ✅ Thêm mới
    ];

    protected $casts = [
        'closed_at' => 'datetime',
        'rating' => 'integer',
    ];

    /**
     * Người dùng tạo phòng chat
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Số lượng tin nhắn chưa đọc
     */
    public function unreadMessageCount(): int
    {
        return $this->messages()
            ->where('sender_type', 'user')
            ->where('is_read', false)
            ->count();
    }

    /**
     * Tin nhắn cuối cùng trong phòng
     */
    public function lastMessage()
    {
        return $this->messages()->latest()->first();
    }
}
