<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Coupon;
use App\Models\ProductVariant;
use App\Models\CartItem;

class PaymentController extends Controller
{
    /**
     * ✅ Tạo URL thanh toán VNPay
     */
    public function vnpay_payment(Request $request)
    {
        try {
            $validated = $request->validate([
                'order_id' => 'required|integer|exists:orders,id',
                'bank_code' => 'nullable|string',
            ]);

            Log::info('🔔 VNPay payment request', [
                'order_id' => $validated['order_id'],
                'bank_code' => $validated['bank_code'] ?? null,
                'ip' => $request->ip(),
            ]);

            $order = Order::find($validated['order_id']);

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đơn hàng'
                ], 404);
            }

            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Đơn hàng đã được thanh toán'
                ], 400);
            }

            if ($order->payment_method !== 'vnpay') {
                return response()->json([
                    'success' => false,
                    'message' => 'Đơn hàng này không sử dụng VNPay'
                ], 400);
            }

            $amount = $order->final_amount;

            if ($amount < 10000 || $amount > 500000000) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số tiền không hợp lệ (10,000₫ - 500,000,000₫)'
                ], 400);
            }

            date_default_timezone_set('Asia/Ho_Chi_Minh');

            $vnp_TmnCode = config('services.vnpay.tmn_code');
            $vnp_HashSecret = config('services.vnpay.hash_secret');
            $vnp_Url = config('services.vnpay.url');
            // FIX: Hardcode return URL tạm thời
            $vnp_ReturnUrl = config('services.vnpay.return_url');

            if (empty($vnp_TmnCode) || empty($vnp_HashSecret) || empty($vnp_Url)) {
                Log::error('❌ VNPay config missing');
                return response()->json([
                    'success' => false,
                    'message' => 'Cấu hình VNPay chưa đầy đủ'
                ], 500);
            }

            $vnp_TxnRef = $order->id . '_' . time();
            $vnp_OrderInfo = "Thanh toan don hang #{$order->id}";
            $vnp_OrderType = "other";
            $vnp_Amount = $amount * 100;
            $vnp_Locale = "vn";
            $vnp_BankCode = $request->bank_code ?? "";
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

            if (!empty($vnp_BankCode)) {
                $inputData['vnp_BankCode'] = $vnp_BankCode;
            }

            ksort($inputData);

            $hashData = '';
            $query = '';
            foreach ($inputData as $key => $value) {
                $hashData .= ($hashData ? '&' : '') . urlencode($key) . '=' . urlencode($value);
                $query .= ($query ? '&' : '') . urlencode($key) . '=' . urlencode($value);
            }

            $vnpSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
            $vnp_Url = $vnp_Url . '?' . $query . '&vnp_SecureHash=' . $vnpSecureHash;

            Log::info('✅ VNPay URL generated', [
                'order_id' => $order->id,
                'txn_ref' => $vnp_TxnRef,
                'amount' => $amount,
            ]);

            return response()->json([
                'success' => true,
                'payment_url' => $vnp_Url,
                'order_id' => $order->id,
                'txn_ref' => $vnp_TxnRef,
            ]);

        } catch (\Exception $e) {
            Log::error('❌ VNPay payment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo thanh toán'
            ], 500);
        }
    }

    private function processSuccessfulPayment(Order $order, array $paymentData): bool
    {
        $lockKey = "payment_processing:{$order->id}";
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::warning('⚠️ Payment being processed', ['order_id' => $order->id]);
            return false;
        }

        try {
            // ✅ FIX: Load items relationship
            $order->refresh();
            $order->load('items'); // ← QUAN TRỌNG!

            if ($order->isPaymentProcessed()) {
                Log::info('✅ Already processed (idempotent)', ['order_id' => $order->id]);
                return true;
            }

            DB::beginTransaction();

            // 1. Tạo transaction SUCCESS
            $transaction = PaymentTransaction::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'transaction_code' => $paymentData['transaction_no']
                ],
                [
                    'amount' => $paymentData['amount'],
                    'status' => 'success',
                    'payment_method' => 'vnpay',
                    'bank_code' => $paymentData['bank_code'] ?? null,
                    'response_code' => $paymentData['response_code'],
                    'paid_at' => $paymentData['paid_at'],
                    'transaction_info' => $paymentData['transaction_info'],
                ]
            );

            Log::info('💳 Transaction SUCCESS', ['id' => $transaction->id]);

            // 2. Update order PAID
            $updated = Order::where('id', $order->id)
                ->where('payment_status', '!=', 'paid')
                ->update([
                    'payment_status' => 'paid',
                    'paid_at' => $paymentData['paid_at'],
                ]);

            if (!$updated) {
                Log::info('⚠️ Already paid by another process');
                DB::rollBack();
                return true;
            }

            Log::info('📦 Order PAID', ['order_id' => $order->id]);

            // 3. Trừ stock VÀ TĂNG quantity_sold ✅
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    $variant = ProductVariant::lockForUpdate()->find($item->variant_id);

                    if (!$variant) {
                        throw new \Exception("Variant {$item->variant_id} not found");
                    }

                    if ($variant->stock_quantity < $item->quantity) {
                        throw new \Exception("Insufficient stock for variant {$variant->id}");
                    }

                    $oldStock = $variant->stock_quantity;
                    $oldSold = $variant->quantity_sold;

                    // ✅ TRỪ STOCK VÀ TĂNG QUANTITY_SOLD
                    $variant->decrement('stock_quantity', $item->quantity);
                    $variant->increment('quantity_sold', $item->quantity);

                    Log::info('📉 Stock decreased & quantity_sold increased', [
                        'variant_id' => $variant->id,
                        'product_name' => $item->product_name,
                        'old_stock' => $oldStock,
                        'new_stock' => $variant->fresh()->stock_quantity,
                        'old_sold' => $oldSold,
                        'new_sold' => $variant->fresh()->quantity_sold,
                        'qty' => $item->quantity,
                        'order_id' => $order->id,
                    ]);
                }
            }

            // 4. Đánh dấu coupon
            if ($order->coupon_id) {
                // TODO: Fix coupons table - thêm column 'used' hoặc dùng logic khác
                // Coupon::where('id', $order->coupon_id)
                //     ->where('used', false)
                //     ->update(['used' => true]);
                Log::info('🎟️ Coupon skipped (needs fix)', ['coupon_id' => $order->coupon_id]);
            }

            // 5. Xóa cart
            $variantIds = $order->items->pluck('variant_id')->filter()->unique();
            if ($variantIds->isNotEmpty()) {
                CartItem::whereIn('variant_id', $variantIds)
                    ->whereHas('cart', fn($q) => $q->where('user_id', $order->user_id))
                    ->delete();
                Log::info('🛒 Cart cleared');
            }

            // 6. Update shipping
            if ($order->shipping) {
                $order->shipping->update(['shipping_status' => 'pending']);
                Log::info('🚚 Shipping pending');
            }

            DB::commit();

            Log::info('🎉 ✅ PAYMENT SUCCESS', [
                'order_id' => $order->id,
                'transaction_id' => $transaction->id,
                'amount' => $paymentData['amount'],
                'source' => $paymentData['source'] ?? 'unknown'
            ]);

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Payment processing failed: ' . $e->getMessage(), [
                'order_id' => $order->id,
                'line' => $e->getLine()
            ]);
            throw $e;
        } finally {
            $lock->release();
        }
    }

    /**
     * ✅ HELPER: Xử lý thanh toán thất bại
     */
    private function processFailedPayment(Order $order, array $paymentData): bool
    {
        $lockKey = "payment_processing:{$order->id}";
        $lock = Cache::lock($lockKey, 10);

        if (!$lock->get()) {
            Log::warning('⚠️ Payment being processed', ['order_id' => $order->id]);
            return false;
        }

        try {
            DB::beginTransaction();

            // 1. Tạo transaction FAILED
            $transaction = PaymentTransaction::updateOrCreate(
                [
                    'order_id' => $order->id,
                    'transaction_code' => $paymentData['transaction_code']
                ],
                [
                    'amount' => $paymentData['amount'],
                    'status' => 'failed',
                    'payment_method' => 'vnpay',
                    'bank_code' => $paymentData['bank_code'] ?? null,
                    'response_code' => $paymentData['response_code'],
                    'transaction_info' => $paymentData['transaction_info'],
                ]
            );

            Log::info('💳 Transaction FAILED', ['id' => $transaction->id]);

            // 2. Update order FAILED
            Order::where('id', $order->id)
                ->where('payment_status', '!=', 'paid')
                ->update(['payment_status' => 'failed']);

            Log::info('📦 Order FAILED', ['order_id' => $order->id]);

            DB::commit();

            Log::warning('⚠️ ❌ PAYMENT FAILED', [
                'order_id' => $order->id,
                'transaction_id' => $transaction->id,
                'response_code' => $paymentData['response_code'],
                'source' => $paymentData['source'] ?? 'unknown'
            ]);

            // 6. Update shipping
            if ($order->shipping) {
                $order->shipping->update(['shipping_status' => 'nodone']);
                Log::info('🚚 Shipping pending');
            }

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Failed payment error: ' . $e->getMessage());
            throw $e;
        } finally {
            $lock->release();
        }
    }

    /**
     * ✅ IPN - Webhook từ VNPay
     */
    public function vnpay_ipn(Request $request)
    {
        $input = $request->all();
        $vnp_HashSecret = config('services.vnpay.hash_secret');

        Log::info('🔔 📥 IPN RECEIVED', ['data' => $input]);

        try {
            // Verify signature
            $vnp_SecureHash = $input['vnp_SecureHash'] ?? '';
            $inputData = $input;
            unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);

            ksort($inputData);
            $hashdata = '';
            foreach ($inputData as $key => $value) {
                $hashdata .= ($hashdata ? '&' : '') . urlencode($key) . '=' . urlencode($value);
            }
            $secureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);

            if ($secureHash !== $vnp_SecureHash) {
                Log::warning('❌ IPN: Invalid signature');
                return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
            }

            Log::info('✅ IPN: Signature valid');

            // Parse data
            $txnRef = $input['vnp_TxnRef'] ?? null;
            $orderId = explode('_', $txnRef)[0] ?? null;
            $responseCode = $input['vnp_ResponseCode'] ?? '';
            $vnpAmount = isset($input['vnp_Amount']) ? intval($input['vnp_Amount']) / 100 : 0;
            $transactionNo = $input['vnp_TransactionNo'] ?? '';
            $bankCode = $input['vnp_BankCode'] ?? '';
            $payDate = $input['vnp_PayDate'] ?? '';

            // Load order
            $order = Order::with('items')->find($orderId);
            if (!$order) {
                Log::warning('❌ IPN: Order not found', ['order_id' => $orderId]);
                return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
            }

            // Validate amount
            if (abs($vnpAmount - $order->final_amount) > 1) {
                Log::error('❌ IPN: Amount mismatch', [
                    'vnp' => $vnpAmount,
                    'order' => $order->final_amount
                ]);
                return response()->json(['RspCode' => '04', 'Message' => 'Invalid amount']);
            }

            // XỬ LÝ THANH TOÁN
            if ($responseCode === '00') {
                Log::info('💚 IPN: SUCCESS (00)');

                $paidAt = $payDate ? \DateTime::createFromFormat('YmdHis', $payDate) : now();

                $paymentData = [
                    'transaction_no' => $transactionNo,
                    'amount' => $vnpAmount,
                    'bank_code' => $bankCode,
                    'response_code' => $responseCode,
                    'paid_at' => $paidAt,
                    'source' => 'IPN',
                    'transaction_info' => [
                        'vnp_TxnRef' => $txnRef,
                        'vnp_TransactionNo' => $transactionNo,
                        'vnp_BankCode' => $bankCode,
                        'vnp_PayDate' => $payDate,
                        'vnp_ResponseCode' => $responseCode,
                        'full_ipn_data' => $input,
                        'processed_at' => now()->toDateTimeString(),
                    ],
                ];

                $this->processSuccessfulPayment($order, $paymentData);
                return response()->json(['RspCode' => '00', 'Message' => 'Success']);

            } else {
                Log::warning('⚠️ IPN: FAILED (' . $responseCode . ')');

                $paymentData = [
                    'transaction_code' => $transactionNo ?: 'FAILED_' . $orderId . '_' . time(),
                    'amount' => $vnpAmount,
                    'bank_code' => $bankCode,
                    'response_code' => $responseCode,
                    'source' => 'IPN',
                    'transaction_info' => [
                        'vnp_TxnRef' => $txnRef,
                        'vnp_ResponseCode' => $responseCode,
                        'error_message' => $this->getVNPayErrorMessage($responseCode),
                        'full_ipn_data' => $input,
                        'processed_at' => now()->toDateTimeString(),
                    ],
                ];

                $this->processFailedPayment($order, $paymentData);
                return response()->json(['RspCode' => '00', 'Message' => 'Confirmed']);
            }
        } catch (\Exception $e) {
            Log::error('❌ IPN error: ' . $e->getMessage());
            return response()->json(['RspCode' => '99', 'Message' => 'Unknown error']);
        }
    }

    // File: PaymentController.php - Hàm vnpay_return()

    public function vnpay_return(Request $request)
    {
        $input = $request->all();
        $vnp_HashSecret = config('services.vnpay.hash_secret');

        Log::info('🔔 🌐 RETURN URL', ['data' => $input]);

        try {
            // Verify signature
            $vnp_SecureHash = $input['vnp_SecureHash'] ?? '';
            $inputData = $input;
            unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);

            ksort($inputData);
            $hashdata = '';
            foreach ($inputData as $key => $value) {
                $hashdata .= ($hashdata ? '&' : '') . urlencode($key) . '=' . urlencode($value);
            }
            $secureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);

            if ($secureHash !== $vnp_SecureHash) {
                Log::warning('❌ Return: Invalid signature');
                // ✅ Vẫn redirect về frontend nhưng với error
                return redirect()->away('http://localhost:3000/payment/success?error=invalid_signature');
            }

            Log::info('✅ Return: Signature valid');

            // Parse data
            $txnRef = $input['vnp_TxnRef'] ?? null;
            $orderId = explode('_', $txnRef)[0] ?? null;
            $responseCode = $input['vnp_ResponseCode'] ?? '';
            $vnpAmount = isset($input['vnp_Amount']) ? intval($input['vnp_Amount']) / 100 : 0;
            $transactionNo = $input['vnp_TransactionNo'] ?? '';
            $bankCode = $input['vnp_BankCode'] ?? '';
            $payDate = $input['vnp_PayDate'] ?? '';

            $order = Order::with(['transactions', 'items', 'shipping'])->find($orderId);
            if (!$order) {
                Log::warning('❌ Return: Order not found');
                return redirect()->away('http://localhost:3000/payment/success?error=order_not_found');
            }

            Log::info('📦 Order found', [
                'order_id' => $order->id,
                'payment_status' => $order->payment_status
            ]);

            // FALLBACK (nếu IPN chưa xử lý)
            if (!$order->isPaymentProcessed() && $order->payment_status !== 'failed') {
                Log::info('🔄 Return: Processing FALLBACK');

                try {
                    if ($responseCode === '00') {
                        Log::info('💚 Return: Processing SUCCESS (00)');

                        $paidAt = $payDate ? \DateTime::createFromFormat('YmdHis', $payDate) : now();

                        $paymentData = [
                            'transaction_no' => $transactionNo,
                            'amount' => $vnpAmount,
                            'bank_code' => $bankCode,
                            'response_code' => $responseCode,
                            'paid_at' => $paidAt,
                            'source' => 'Return (fallback)',
                            'transaction_info' => [
                                'vnp_TxnRef' => $txnRef,
                                'vnp_TransactionNo' => $transactionNo,
                                'vnp_BankCode' => $bankCode,
                                'vnp_PayDate' => $payDate,
                                'vnp_ResponseCode' => $responseCode,
                                'full_return_data' => $input,
                                'processed_at' => now()->toDateTimeString(),
                            ],
                        ];

                        $this->processSuccessfulPayment($order, $paymentData);

                    } else {
                        Log::warning('⚠️ Return: FAILED (' . $responseCode . ')');

                        $paymentData = [
                            'transaction_code' => $transactionNo ?: 'FAILED_' . $orderId . '_' . time(),
                            'amount' => $vnpAmount,
                            'bank_code' => $bankCode,
                            'response_code' => $responseCode,
                            'source' => 'Return (fallback)',
                            'transaction_info' => [
                                'vnp_TxnRef' => $txnRef,
                                'vnp_ResponseCode' => $responseCode,
                                'error_message' => $this->getVNPayErrorMessage($responseCode),
                                'full_return_data' => $input,
                                'processed_at' => now()->toDateTimeString(),
                            ],
                        ];

                        $this->processFailedPayment($order, $paymentData);
                    }
                } catch (\Exception $e) {
                    Log::error('❌ Return fallback error: ' . $e->getMessage());
                }
            }

            // ✅ FIX: Redirect về frontend VỚI TẤT CẢ PARAMS VNPAY
            $order->refresh();

            $frontendUrl = 'http://localhost:3000/payment/success';
            $redirectParams = http_build_query([
                // ✅ Truyền đủ params VNPay để frontend parse
                'vnp_ResponseCode' => $responseCode,
                'vnp_TxnRef' => $txnRef,
                'vnp_Amount' => $input['vnp_Amount'] ?? '',
                'vnp_TransactionNo' => $transactionNo,
                'vnp_BankCode' => $bankCode,
                'vnp_OrderInfo' => $input['vnp_OrderInfo'] ?? '',

                // Thêm order info
                'order_id' => $orderId,
                'payment_status' => $order->payment_status,
            ]);

            return redirect()->away($frontendUrl . '?' . $redirectParams);

        } catch (\Exception $e) {
            Log::error('❌ Return error: ' . $e->getMessage());
            return redirect()->away('http://localhost:3000/payment/success?error=system_error');
        }
    }

    /**
     * ✅ Check payment status
     */
    public function check_payment_status($orderId)
    {
        try {
            Log::info('🔍 Check status', ['order_id' => $orderId]);

            $order = Order::with(['latestTransaction'])->findOrFail($orderId);
            $transaction = $order->latestTransaction;

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'order_sku' => $order->sku,
                    'payment_status' => $order->payment_status,
                    'status' => $order->status ?? 'pending',
                    'amount' => $order->final_amount,
                    'final_amount' => $order->final_amount,
                    'paid_at' => $order->paid_at,
                    'payment_method' => $order->payment_method,
                    'transaction' => $transaction ? [
                        'id' => $transaction->id,
                        'transaction_code' => $transaction->transaction_code,
                        'status' => $transaction->status,
                        'amount' => $transaction->amount,
                        'payment_method' => $transaction->payment_method,
                        'bank_code' => $transaction->bank_code,
                        'paid_at' => $transaction->paid_at,
                        'response_code' => $transaction->response_code,
                    ] : null,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Check status error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng'
            ], 404);
        }
    }

    private function getVNPayErrorMessage($code)
    {
        $messages = [
            '00' => ['short' => 'Giao dịch thành công'],
            '07' => ['short' => 'Giao dịch đang được xử lý'],
            '09' => ['short' => 'Thẻ/Tài khoản chưa đăng ký Internet Banking'],
            '10' => ['short' => 'Xác thực thất bại'],
            '11' => ['short' => 'Hết hạn thanh toán'],
            '12' => ['short' => 'Thẻ/Tài khoản bị khóa'],
            '13' => ['short' => 'Sai OTP'],
            '24' => ['short' => 'Đã hủy thanh toán'],
            '51' => ['short' => 'Số dư không đủ'],
            '65' => ['short' => 'Vượt hạn mức giao dịch'],
            '75' => ['short' => 'Ngân hàng đang bảo trì'],
            '79' => ['short' => 'Nhập sai mật khẩu quá số lần'],
            '99' => ['short' => 'Lỗi không xác định'],
        ];

        return $messages[$code] ?? ['short' => 'Lỗi không xác định', 'detail' => 'Mã lỗi: ' . $code];
    }

    /**
     * ✅ Thanh toán lại đơn hàng
     */
    public function repay(Request $request, $orderId)
    {
        try {
            $validated = $request->validate([
                'payment_method' => 'required|in:vnpay,cod',
                'bank_code' => 'nullable|string',
            ]);

            // Lấy user từ request (phải có middleware auth)
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng đăng nhập để thực hiện thanh toán'
                ], 401);
            }

            Log::info('🔄 Repay request', [
                'order_id' => $orderId,
                'payment_method' => $validated['payment_method'],
                'user_id' => $user->id,
            ]);

            $order = Order::with(['items', 'shipping'])->find($orderId);

            if (!$order) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy đơn hàng'
                ], 404);
            }

            // Kiểm tra quyền sở hữu
            if ($order->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn không có quyền truy cập đơn hàng này'
                ], 403);
            }

            // Kiểm tra trạng thái có thể thanh toán lại
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Đơn hàng đã được thanh toán'
                ], 400);
            }

            // Kiểm tra nếu đơn hàng đã bị hủy
            if ($order->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể thanh toán đơn hàng đã bị hủy'
                ], 400);
            }

            // ⚠️ CHỈ KIỂM TRA STOCK KHI CHUYỂN TỪ FAILED/PENDING SANG VNPAY
            // Không kiểm tra nếu đơn hàng đã PAID trước đó (vì stock đã trừ rồi)
            if ($order->payment_status !== 'paid') {
                foreach ($order->items as $item) {
                    if ($item->variant_id) {
                        $variant = ProductVariant::find($item->variant_id);

                        if (!$variant) {
                            return response()->json([
                                'success' => false,
                                'message' => "Sản phẩm '{$item->product_name}' không còn tồn tại"
                            ], 400);
                        }

                        if ($variant->stock_quantity < $item->quantity) {
                            return response()->json([
                                'success' => false,
                                'message' => "Sản phẩm '{$item->product_name}' không đủ số lượng trong kho"
                            ], 400);
                        }
                    }
                }
            }

            DB::beginTransaction();

            try {
                // ✅ FIX: Dùng 'unpaid' thay vì 'pending' vì ENUM không có 'pending'
                DB::table('orders')
                    ->where('id', $order->id)
                    ->update([
                        'payment_method' => $validated['payment_method'],
                        'payment_status' => 'unpaid', // ✅ Đổi từ 'pending' sang 'unpaid'
                        'updated_at' => now(),
                    ]);

                Log::info('📦 Order updated via DB::update', [
                    'order_id' => $order->id,
                    'payment_method' => $validated['payment_method'],
                    'payment_status' => 'unpaid'
                ]);

                // Reset shipping status nếu cần
                if ($order->shipping && $order->shipping->shipping_status === 'nodone') {
                    // ✅ FIX: Chỉ update shipping_status, bỏ updated_at
                    DB::table('shipping')
                        ->where('order_id', $order->id)
                        ->update([
                            'shipping_status' => 'pending',
                        ]);

                    Log::info('🚚 Shipping status updated', [
                        'order_id' => $order->id,
                        'status' => 'pending'
                    ]);
                }

                DB::commit();

                // Refresh order để lấy data mới
                $order->refresh();

                Log::info('✅ Transaction committed for repayment', [
                    'order_id' => $order->id
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('❌ Transaction rollback: ' . $e->getMessage(), [
                    'order_id' => $orderId,
                    'line' => $e->getLine(),
                    'file' => $e->getFile()
                ]);
                throw $e;
            }

            // Xử lý theo phương thức thanh toán
            if ($validated['payment_method'] === 'vnpay') {
                // Tạo URL thanh toán VNPay
                $amount = $order->final_amount;

                if ($amount < 10000 || $amount > 500000000) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Số tiền không hợp lệ (10,000₫ - 500,000,000₫)'
                    ], 400);
                }

                date_default_timezone_set('Asia/Ho_Chi_Minh');

                $vnp_TmnCode = config('services.vnpay.tmn_code');
                $vnp_HashSecret = config('services.vnpay.hash_secret');
                $vnp_Url = config('services.vnpay.url');
                $vnp_ReturnUrl = config('services.vnpay.return_url');

                if (empty($vnp_TmnCode) || empty($vnp_HashSecret) || empty($vnp_Url)) {
                    Log::error('❌ VNPay config missing');
                    return response()->json([
                        'success' => false,
                        'message' => 'Cấu hình VNPay chưa đầy đủ'
                    ], 500);
                }

                $vnp_TxnRef = $order->id . '_REPAY_' . time();
                $vnp_OrderInfo = "Thanh toan lai don hang #{$order->id}";
                $vnp_OrderType = "other";
                $vnp_Amount = $amount * 100;
                $vnp_Locale = "vn";
                $vnp_BankCode = $validated['bank_code'] ?? "";
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

                if (!empty($vnp_BankCode)) {
                    $inputData['vnp_BankCode'] = $vnp_BankCode;
                }

                ksort($inputData);

                $hashData = '';
                $query = '';
                foreach ($inputData as $key => $value) {
                    $hashData .= ($hashData ? '&' : '') . urlencode($key) . '=' . urlencode($value);
                    $query .= ($query ? '&' : '') . urlencode($key) . '=' . urlencode($value);
                }

                $vnpSecureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
                $vnp_Url = $vnp_Url . '?' . $query . '&vnp_SecureHash=' . $vnpSecureHash;

                Log::info('✅ Repay VNPay URL generated', [
                    'order_id' => $order->id,
                    'txn_ref' => $vnp_TxnRef,
                    'amount' => $amount,
                ]);

                return response()->json([
                    'success' => true,
                    'payment_method' => 'vnpay',
                    'payment_url' => $vnp_Url,
                    'order_id' => $order->id,
                    'txn_ref' => $vnp_TxnRef,
                    'message' => 'Đã tạo link thanh toán VNPay'
                ]);

            } else {
                // COD - Chỉ cần cập nhật trạng thái
                Log::info('✅ Repay COD success', ['order_id' => $order->id]);

                return response()->json([
                    'success' => true,
                    'payment_method' => 'cod',
                    'order_id' => $order->id,
                    'message' => 'Đã chuyển sang thanh toán COD'
                ]);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            Log::error('❌ Repay validation error', [
                'order_id' => $orderId,
                'errors' => $e->errors()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Repay error: ' . $e->getMessage(), [
                'order_id' => $orderId,
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString() // ✅ Thêm trace để debug
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xử lý thanh toán',
                'error' => config('app.debug') ? $e->getMessage() : null // ✅ Hiện lỗi nếu debug mode
            ], 500);
        }
    }


}