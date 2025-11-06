<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'transaction_code',
        'amount',
        'status',
        'payment_method',
        'bank_code',
        'response_code',
        'transaction_info',
        'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'transaction_info' => 'array',
        'amount' => 'decimal:2',
    ];

    // ==================== RELATIONSHIPS ====================
    
    /**
     * Transaction thuộc về một Order
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // ==================== SCOPES ====================
    
    /**
     * Scope: Chỉ lấy transaction thành công
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope: Chỉ lấy transaction thất bại
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope: Chỉ lấy transaction đang chờ
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Lọc theo VNPay
     */
    public function scopeVNPay($query)
    {
        return $query->where('payment_method', 'vnpay');
    }

    /**
     * Scope: Lọc theo COD
     */
    public function scopeCOD($query)
    {
        return $query->where('payment_method', 'cod');
    }

    /**
     * Scope: Lọc theo bank code
     */
    public function scopeByBank($query, $bankCode)
    {
        return $query->where('bank_code', $bankCode);
    }

    /**
     * Scope: Lọc theo khoảng thời gian
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    // ==================== ACCESSORS ====================
    
    /**
     * Lấy text hiển thị của status
     */
    public function getStatusTextAttribute()
    {
        return [
            'success' => 'Thành công',
            'pending' => 'Đang xử lý',
            'failed' => 'Thất bại',
        ][$this->status] ?? $this->status;
    }

    /**
     * Lấy text hiển thị của payment method
     */
    public function getPaymentMethodTextAttribute()
    {
        return [
            'vnpay' => 'VNPay',
            'cod' => 'COD',
            'momo' => 'MoMo',
            'bank_transfer' => 'Chuyển khoản',
        ][$this->payment_method] ?? $this->payment_method;
    }

    /**
     * Format số tiền hiển thị
     */
    public function getFormattedAmountAttribute()
    {
        $amount = (float) $this->amount;
        return number_format($amount, 0, ',', '.') . '₫';
    }

    /**
     * Lấy thông tin ngân hàng từ bank_code
     */
    public function getBankNameAttribute()
    {
        $banks = [
            'NCB' => 'Ngân hàng NCB',
            'VIETCOMBANK' => 'Vietcombank',
            'TECHCOMBANK' => 'Techcombank',
            'MBBANK' => 'MB Bank',
            'AGRIBANK' => 'Agribank',
            'BIDV' => 'BIDV',
            'VPBANK' => 'VPBank',
            'ACB' => 'ACB',
            'SACOMBANK' => 'Sacombank',
            'DONGABANK' => 'Đông Á Bank',
        ];

        return $banks[$this->bank_code] ?? $this->bank_code;
    }

    // ==================== METHODS ====================
    
    /**
     * Kiểm tra transaction có thành công không
     */
    public function isSuccessful()
    {
        return $this->status === 'success';
    }

    /**
     * Kiểm tra transaction có thất bại không
     */
    public function isFailed()
    {
        return $this->status === 'failed';
    }

    /**
     * Kiểm tra transaction có đang pending không
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Lấy message lỗi từ response_code
     */
    public function getErrorMessage()
    {
        if ($this->status === 'success') {
            return null;
        }

        $messages = [
            '07' => 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
            '09' => 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
            '10' => 'Xác thực thông tin không đúng quá 3 lần.',
            '11' => 'Đã hết hạn chờ thanh toán.',
            '12' => 'Thẻ/Tài khoản bị khóa.',
            '13' => 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
            '24' => 'Khách hàng hủy giao dịch.',
            '51' => 'Tài khoản không đủ số dư.',
            '65' => 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
            '75' => 'Ngân hàng thanh toán đang bảo trì.',
            '79' => 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
            '99' => 'Lỗi không xác định.',
        ];

        return $messages[$this->response_code] ?? 'Lỗi không xác định';
    }

    // ==================== STATIC METHODS ====================
    
    /**
     * Tạo transaction từ VNPay IPN
     */
    public static function createFromVNPayIPN($data)
    {
        return self::create([
            'order_id' => $data['order_id'],
            'transaction_code' => $data['transaction_code'],
            'amount' => $data['amount'],
            'status' => $data['status'],
            'payment_method' => 'vnpay',
            'bank_code' => $data['bank_code'] ?? null,
            'response_code' => $data['response_code'],
            'paid_at' => $data['paid_at'] ?? now(),
            'transaction_info' => $data['transaction_info'] ?? [],
        ]);
    }

    /**
     * Thống kê transactions theo status
     */
    public static function statisticsByStatus($from = null, $to = null)
    {
        $query = self::query();

        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to]);
        }

        return $query->selectRaw('status, COUNT(*) as count, SUM(amount) as total_amount')
            ->groupBy('status')
            ->get();
    }

    /**
     * Thống kê transactions theo payment method
     */
    public static function statisticsByPaymentMethod($from = null, $to = null)
    {
        $query = self::query();

        if ($from && $to) {
            $query->whereBetween('created_at', [$from, $to]);
        }

        return $query->selectRaw('payment_method, COUNT(*) as count, SUM(amount) as total_amount')
            ->groupBy('payment_method')
            ->get();
    }
}