<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordApiNotification extends Notification
{
    use Queueable;

    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        // Lấy frontend URL từ config
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');

        // Tạo URL reset password trực tiếp đến frontend (bỏ qua backend redirect)
        $resetUrl = $frontendUrl . "/reset-password?token=" . $this->token . "&email=" . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Khôi phục mật khẩu - ' . config('app.name'))
            ->greeting('Xin chào ' . $notifiable->name . '!')
            ->line('Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.')
            ->action('Đặt lại mật khẩu', $resetUrl)
            ->line('Link này sẽ hết hạn sau 60 phút.')
            ->line('Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.')
            ->salutation('Trân trọng, ' . config('app.name'));
    }
}