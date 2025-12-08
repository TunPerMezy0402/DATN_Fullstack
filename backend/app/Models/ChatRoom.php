<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatRoom extends Model
{
    // Cột có thể gán hàng loạt
    protected $fillable = [
        'user_id',       // Người tạo phòng chat
        'assigned_to',   // Agent được gán (tham chiếu support_agents.id)
        'status',        // open/closed
        'subject',       // Chủ đề/phần tiêu đề
        'closed_at',     // Thời gian đóng phòng
    ];

    // Ép kiểu dữ liệu
    protected $casts = [
        'closed_at' => 'datetime',
    ];

    /**
     * Người dùng tạo phòng chat
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Agent được gán cho phòng chat
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(SupportAgent::class, 'assigned_to');
    }

    /**
     * Danh sách tin nhắn trong phòng
     */
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
