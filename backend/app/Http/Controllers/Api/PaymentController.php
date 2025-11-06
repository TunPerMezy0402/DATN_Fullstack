<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Coupon;

class PaymentController extends Controller
{
    /**
     * Tạo URL thanh toán VNPay
     */
    public function vnpay_payment(Request $request)
    {
        try {
            $request->validate([
                'order_id' => 'required|integer|exists:orders,id',
                'bank_code' => 'nullable|string',
            ]);

            $order = Order::findOrFail($request->order_id);
            
            // Kiểm tra đơn hàng đã thanh toán
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Đơn hàng đã được thanh toán'
                ], 400);
            }

            $amount = $order->final_amount;
            
            // Validate số tiền theo quy định VNPay
            if ($amount < 10000 || $amount > 500000000) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số tiền không hợp lệ (10,000₫ - 500,000,000₫)'
                ], 400);
            }

            date_default_timezone_set('Asia/Ho_Chi_Minh');

            // Lấy config VNPay
            $vnp_TmnCode = config('services.vnpay.tmn_code');
            $vnp_HashSecret = config('services.vnpay.hash_secret');
            $vnp_Url = config('services.vnpay.url');
            $vnp_ReturnUrl = config('services.vnpay.return_url');

            // Build input data
            $vnp_TxnRef = $order->id . '_' . time(); // Thêm timestamp để tránh trùng
            $vnp_OrderInfo = "Thanh toan don hang #{$order->id}";
            $vnp_OrderType = "other";
            $vnp_Amount = $amount * 100; // VNPay yêu cầu nhân 100
            $vnp_Locale = "vn";
            /* $vnp_BankCode = $request->bank_code ?? ""; */
            $vnp_BankCode = "NCB";
            $vnp_IpAddr = $request->ip();

            $inputData = [
                "vnp_Version" => "2.1.0",
                "vnp_TmnCode" => $vnp_TmnCode,
                "vnp_Amount" => $vnp_Amount,
                "vnp_Command" => "pay",
                "vnp_CreateDate" => date('YmdHis'),
                "vnp_CurrCode" => "VND",
                "vnp_IpAddr" => $vnp_IpAddr,
                "vnp_Locale" => $vnp_Locale,
                "vnp_OrderInfo" => $vnp_OrderInfo,
                "vnp_OrderType" => $vnp_OrderType,
                "vnp_ReturnUrl" => $vnp_ReturnUrl,
                "vnp_TxnRef" => $vnp_TxnRef,
            ];

            // Thêm bank code nếu có
            if (!empty($vnp_BankCode)) {
                $inputData['vnp_BankCode'] = $vnp_BankCode;
            }

            // Sort theo alphabet
            ksort($inputData);

            // Build hash data (QUAN TRỌNG: phải urlencode cả key và value)
            $hashData = '';
            $query = '';
            foreach ($inputData as $key => $value) {
                $hashData .= ($hashData ? '&' : '') . urlencode($key) . '=' . urlencode($value);
                $query .= ($query ? '&' : '') . urlencode($key) . '=' . urlencode($value);
            }

            // Tạo secure hash
            $vnpSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

            // Final URL
            $vnp_Url = $vnp_Url . '?' . $query . '&vnp_SecureHash=' . $vnpSecureHash;

            Log::info('VNPay Payment URL Generated', [
                'order_id' => $order->id,
                'txn_ref' => $vnp_TxnRef,
                'amount' => $amount,
                'user_id' => $order->user_id,
            ]);

            return response()->json([
                'success' => true,
                'payment_url' => $vnp_Url,
                'order_id' => $order->id,
                'txn_ref' => $vnp_TxnRef,
            ]);

        } catch (\Exception $e) {
            Log::error('VNPay Payment Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo thanh toán'
            ], 500);
        }
    }

    /**
     * IPN - Webhook từ VNPay (xử lý bất đồng bộ)
     */
    public function vnpay_ipn(Request $request)
    {
        $input = $request->all();
        $vnp_HashSecret = config('services.vnpay.hash_secret');

        Log::info('VNPay IPN Received', $input);

        // 1. Kiểm tra chữ ký
        $vnp_SecureHash = $input['vnp_SecureHash'] ?? '';
        $inputData = $input;
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);

        // Sort và build hash (PHẢI GIỐNG VỚI LÚC TẠO URL)
        ksort($inputData);
        $hashdata = '';
        foreach ($inputData as $key => $value) {
            $hashdata .= ($hashdata ? '&' : '') . urlencode($key) . '=' . urlencode($value);
        }
        $secureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);

        if ($secureHash !== $vnp_SecureHash) {
            Log::warning('VNPay IPN: Invalid signature', [
                'calculated' => $secureHash,
                'received' => $vnp_SecureHash
            ]);
            return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
        }

        // 2. Lấy thông tin
        $txnRef = $input['vnp_TxnRef'] ?? null;
        $orderId = explode('_', $txnRef)[0] ?? null; // Tách order_id từ txnRef
        $responseCode = $input['vnp_ResponseCode'] ?? '';
        $vnpAmount = isset($input['vnp_Amount']) ? intval($input['vnp_Amount']) / 100 : 0;
        $transactionNo = $input['vnp_TransactionNo'] ?? '';
        $bankCode = $input['vnp_BankCode'] ?? '';
        $bankTranNo = $input['vnp_BankTranNo'] ?? '';
        $cardType = $input['vnp_CardType'] ?? '';
        $payDate = $input['vnp_PayDate'] ?? '';

        // 3. Kiểm tra đơn hàng
        $order = Order::find($orderId);
        if (!$order) {
            Log::warning('VNPay IPN: Order not found', ['order_id' => $orderId]);
            return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
        }

        // 4. Kiểm tra transaction đã xử lý chưa (idempotency)
        if ($transactionNo) {
            $existingTransaction = PaymentTransaction::where('transaction_code', $transactionNo)->first();
            if ($existingTransaction) {
                Log::info('VNPay IPN: Transaction already processed', [
                    'transaction_code' => $transactionNo,
                    'transaction_id' => $existingTransaction->id
                ]);
                return response()->json(['RspCode' => '02', 'Message' => 'Order already confirmed']);
            }
        }

        // 5. Kiểm tra số tiền (cho phép sai lệch 1đ do làm tròn)
        if (abs($vnpAmount - $order->final_amount) > 1) {
            Log::warning('VNPay IPN: Amount mismatch', [
                'order_id' => $orderId,
                'vnp_amount' => $vnpAmount,
                'order_amount' => $order->final_amount
            ]);
        }

        // 6. Xử lý transaction trong DB transaction
        DB::beginTransaction();
        try {
            if ($responseCode === '00') {
                // ✅ Thanh toán thành công
                $paidAt = $payDate ? \DateTime::createFromFormat('YmdHis', $payDate) : now();
                
                $transaction = PaymentTransaction::create([
                    'order_id' => $orderId,
                    'transaction_code' => $transactionNo,
                    'amount' => $vnpAmount,
                    'status' => 'success',
                    'payment_method' => 'vnpay',
                    'bank_code' => $bankCode,
                    'response_code' => $responseCode,
                    'paid_at' => $paidAt,
                    'transaction_info' => [
                        'vnp_TxnRef' => $txnRef,
                        'vnp_TransactionNo' => $transactionNo,
                        'vnp_BankCode' => $bankCode,
                        'vnp_BankTranNo' => $bankTranNo,
                        'vnp_CardType' => $cardType,
                        'vnp_PayDate' => $payDate,
                        'vnp_ResponseCode' => $responseCode,
                        'vnp_Amount' => $vnpAmount,
                        'vnp_OrderInfo' => $input['vnp_OrderInfo'] ?? '',
                        'vnp_TransactionStatus' => $input['vnp_TransactionStatus'] ?? '',
                        'full_ipn_data' => $input,
                        'processed_at' => now()->toDateTimeString(),
                    ],
                ]);

                // Cập nhật order
                $order->payment_status = 'paid';
                $order->status = 'confirmed';
                $order->paid_at = $paidAt;
                $order->save();

                // Đánh dấu coupon đã dùng (nếu có)
                if ($order->coupon_id) {
                    $coupon = Coupon::find($order->coupon_id);
                    if ($coupon) {
                        $coupon->used = true;
                        $coupon->save();
                    }
                }

                Log::info('VNPay IPN: Payment successful', [
                    'order_id' => $orderId,
                    'transaction_id' => $transaction->id,
                    'transaction_code' => $transactionNo,
                    'amount' => $vnpAmount,
                ]);
                
                DB::commit();
                return response()->json(['RspCode' => '00', 'Message' => 'Success']);
                
            } else {
                // ❌ Thanh toán thất bại
                $transaction = PaymentTransaction::create([
                    'order_id' => $orderId,
                    'transaction_code' => $transactionNo ?: 'FAILED_' . $orderId . '_' . time(),
                    'amount' => $vnpAmount,
                    'status' => 'failed',
                    'payment_method' => 'vnpay',
                    'bank_code' => $bankCode,
                    'response_code' => $responseCode,
                    'transaction_info' => [
                        'vnp_TxnRef' => $txnRef,
                        'vnp_ResponseCode' => $responseCode,
                        'vnp_TransactionNo' => $transactionNo,
                        'vnp_BankCode' => $bankCode,
                        'error_message' => $this->getVNPayErrorMessage($responseCode),
                        'full_ipn_data' => $input,
                        'processed_at' => now()->toDateTimeString(),
                    ],
                ]);

                $order->payment_status = 'failed';
                $order->save();

                Log::warning('VNPay IPN: Payment failed', [
                    'order_id' => $orderId,
                    'response_code' => $responseCode,
                    'transaction_id' => $transaction->id,
                    'error' => $this->getVNPayErrorMessage($responseCode),
                ]);
                
                DB::commit();
                return response()->json(['RspCode' => '00', 'Message' => 'Confirmed']);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('VNPay IPN: Database error - ' . $e->getMessage(), [
                'order_id' => $orderId,
                'exception' => $e->getTraceAsString(),
            ]);
            return response()->json(['RspCode' => '99', 'Message' => 'Unknown error']);
        }
    }

    /**
     * Return URL - Xử lý khi user quay lại từ VNPay
     */
    public function vnpay_return(Request $request)
    {
        $input = $request->all();
        $vnp_HashSecret = config('services.vnpay.hash_secret');

        // Verify signature
        $vnp_SecureHash = $input['vnp_SecureHash'] ?? '';
        $inputData = $input;
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);

        ksort($inputData);
        $hashdata = '';
        foreach ($inputData as $key => $value) {
            $hashdata .= ($hashdata ? '&' : '') . urlencode($key) . '=' . urlencode($value);
        }
        $secureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);

        if ($secureHash !== $vnp_SecureHash) {
            return response()->json([
                'success' => false,
                'message' => 'Chữ ký không hợp lệ'
            ], 400);
        }

        $txnRef = $input['vnp_TxnRef'] ?? null;
        $orderId = explode('_', $txnRef)[0] ?? null;
        $responseCode = $input['vnp_ResponseCode'] ?? '';

        $order = Order::find($orderId);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }

        // Trả về thông tin để frontend xử lý
        return response()->json([
            'success' => true,
            'data' => [
                'order_id' => $orderId,
                'response_code' => $responseCode,
                'message' => $this->getVNPayErrorMessage($responseCode),
                'payment_status' => $order->payment_status,
                'amount' => $order->final_amount,
            ]
        ]);
    }

    /**
     * Kiểm tra trạng thái thanh toán
     */
    public function check_payment_status($orderId)
    {
        try {
            $order = Order::with(['latestTransaction'])->findOrFail($orderId);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'payment_status' => $order->payment_status,
                    'status' => $order->status,
                    'final_amount' => $order->final_amount,
                    'paid_at' => $order->paid_at,
                    'transaction' => $order->latestTransaction ? [
                        'id' => $order->latestTransaction->id,
                        'transaction_code' => $order->latestTransaction->transaction_code,
                        'status' => $order->latestTransaction->status,
                        'amount' => $order->latestTransaction->amount,
                        'payment_method' => $order->latestTransaction->payment_method,
                        'bank_code' => $order->latestTransaction->bank_code,
                        'paid_at' => $order->latestTransaction->paid_at,
                    ] : null,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }
    }

    /**
     * Lấy danh sách transactions của order
     */
    public function get_order_transactions($orderId)
    {
        try {
            $order = Order::findOrFail($orderId);
            
            $transactions = PaymentTransaction::where('order_id', $orderId)
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $transactions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }
    }

    /**
     * [ADMIN] Lấy tất cả transactions
     */
    public function get_all_transactions(Request $request)
    {
        try {
            $query = PaymentTransaction::with('order')
                ->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by payment method
            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

            // Filter by date range
            if ($request->has('from_date')) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }
            if ($request->has('to_date')) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            $perPage = $request->get('per_page', 20);
            $transactions = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $transactions->getCollection()->toArray(),
                'pagination' => [
                    'total' => $transactions->total(),
                    'per_page' => $transactions->perPage(),
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'from' => $transactions->firstItem(),
                    'to' => $transactions->lastItem(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get all transactions error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helper: Lấy message lỗi VNPay
     */
    private function getVNPayErrorMessage($code)
    {
        $messages = [
            '00' => 'Giao dịch thành công',
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

        return $messages[$code] ?? 'Lỗi không xác định';
    }
}