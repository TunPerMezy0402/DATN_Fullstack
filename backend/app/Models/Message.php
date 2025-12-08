<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    // Các cột có thể gán hàng loạt
    protected $fillable = [
        'chat_room_id',   // ID phòng chat
        'sender_id',      // ID người gửi
        'sender_type',    // 'user' hoặc 'admin'
        'content',        // Nội dung tin nhắn (text)
        'attachment',     // Đường dẫn file ảnh
        'is_read',        // Đã đọc hay chưa
    ];

    // Ép kiểu dữ liệu
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
}
