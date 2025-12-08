<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\ResetPasswordApiNotification;


class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'image',
        'google_id',
        'phone',
        'status',
        'role',
        'bank_account_number',
        'bank_name',
        'bank_account_name',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Quan hệ: Sản phẩm yêu thích
     */
    public function likedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'user_likes', 'user_id', 'product_id');
    }

    /**
     * Quan hệ: Địa chỉ giao hàng
     */
    public function addresses(): HasMany
    {
        return $this->hasMany(AddressBook::class, 'user_id');
    }

    /**
     * Quan hệ: Bài đánh giá sản phẩm
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class, 'user_id');
    }

    public function supportAgent(): HasOne
    {
        return $this->hasOne(SupportAgent::class);
    }

    // Quan hệ: phòng chat của user
    public function chatRooms(): HasMany
    {
        return $this->hasMany(ChatRoom::class, 'user_id');
    }

    // Quan hệ: tin nhắn gửi bởi user
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    // Quan hệ: thông báo của user
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordApiNotification($token));
    }
}