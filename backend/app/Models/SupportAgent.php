<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportAgent extends Model
{
    protected $fillable = ['user_id', 'status', 'max_chats', 'current_chats', 'rating'];

    // Quan hệ: user quản lý agent
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Quan hệ: các phòng chat agent phụ trách
    public function chatRooms(): HasMany
    {
        return $this->hasMany(ChatRoom::class, 'agent_id');
    }

    // Kiểm tra agent có khả dụng để nhận chat mới
    public function isAvailable(): bool
    {
        return $this->status !== 'offline' && $this->current_chats < $this->max_chats;
    }
}
