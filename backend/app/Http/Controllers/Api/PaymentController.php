<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Coupon;
use App\Models\ProductVariant;
use App\Models\CartItem;

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

            // Kiểm tra payment method
            if ($order->payment_method !== 'vnpay') {
                return response()->json([
                    'success' => false,
                    'message' => 'Đơn hàng này không sử dụng VNPay'
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
            return response()->json([
                'RspCode' => '97', 
                'Message' => 'Chữ ký không hợp lệ',
                'Status' => 'error',
                'Detail' => 'Xác thực chữ ký thất bại. Vui lòng liên hệ bộ phận hỗ trợ.'
            ]);
        }

        // 2. Lấy thông tin
        $txnRef = $input['vnp_TxnRef'] ?? null;
        $orderId = explode('_', $txnRef)[0] ?? null;
        $responseCode = $input['vnp_ResponseCode'] ?? '';
        $vnpAmount = isset($input['vnp_Amount']) ? intval($input['vnp_Amount']) / 100 : 0;
        $transactionNo = $input['vnp_TransactionNo'] ?? '';
        $bankCode = $input['vnp_BankCode'] ?? '';
        $bankTranNo = $input['vnp_BankTranNo'] ?? '';
        $cardType = $input['vnp_CardType'] ?? '';
        $payDate = $input['vnp_PayDate'] ?? '';

        // 3. Kiểm tra đơn hàng
        $order = Order::with('items')->find($orderId);
        if (!$order) {
            Log::warning('VNPay IPN: Order not found', ['order_id' => $orderId]);
            return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
        }

        // 4. ✅ IDEMPOTENCY: Kiểm tra transaction đã xử lý chưa
        if ($transactionNo) {
            $existingTransaction = PaymentTransaction::where('order_id', $orderId)
                ->where('transaction_code', $transactionNo)
                ->first();
                
            if ($existingTransaction) {
                Log::info('VNPay IPN: Transaction already processed (idempotency)', [
                    'transaction_code' => $transactionNo,
                    'transaction_id' => $existingTransaction->id,
                    'status' => $existingTransaction->status
                ]);
                return response()->json(['RspCode' => '00', 'Message' => 'Transaction already processed']);
            }
        }

        // 5. Kiểm tra số tiền
        if (abs($vnpAmount - $order->final_amount) > 1) {
            Log::error('VNPay IPN: Amount mismatch - REJECTED', [
                'order_id' => $orderId,
                'vnp_amount' => $vnpAmount,
                'order_amount' => $order->final_amount
            ]);
            return response()->json([
                'RspCode' => '04', 
                'Message' => 'Invalid amount'
            ]);
        }

        // 6. Xử lý transaction
        DB::beginTransaction();
        try {
            if ($responseCode === '00') {
                // ✅ THANH TOÁN THÀNH CÔNG
                $paidAt = $payDate ? \DateTime::createFromFormat('YmdHis', $payDate) : now();
                
                // Tìm transaction pending hiện tại và cập nhật
                $transaction = PaymentTransaction::where('order_id', $orderId)
                    ->where('status', 'pending')
                    ->first();

                if ($transaction) {
                    // Cập nhật transaction hiện có
                    $transaction->update([
                        'transaction_code' => $transactionNo,
                        'amount' => $vnpAmount,
                        'status' => 'success',
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
                } else {
                    // Tạo mới nếu chưa có (fallback)
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
                }

                // ✅ CẬP NHẬT ORDER
                $order->payment_status = 'paid';
                $order->status = 'confirmed'; // Đã thanh toán, chờ xử lý
                $order->paid_at = $paidAt;
                $order->save();

                // ✅ TRỪ STOCK (vì lúc tạo đơn VNPay chưa trừ)
                foreach ($order->items as $item) {
                    if ($item->variant_id) {
                        $variant = ProductVariant::lockForUpdate()->find($item->variant_id);
                        if ($variant) {
                            // Kiểm tra stock trước khi trừ
                            if ($variant->stock_quantity < $item->quantity) {
                                Log::error('VNPay IPN: Insufficient stock after payment', [
                                    'variant_id' => $variant->id,
                                    'required' => $item->quantity,
                                    'available' => $variant->stock_quantity,
                                    'order_id' => $orderId
                                ]);
                                
                                // Rollback và thông báo lỗi
                                DB::rollBack();
                                return response()->json([
                                    'RspCode' => '99',
                                    'Message' => 'Insufficient stock'
                                ]);
                            }

                            $variant->decrement('stock_quantity', $item->quantity);
                            
                            Log::info('Stock decreased after VNPay payment', [
                                'variant_id' => $variant->id,
                                'quantity' => $item->quantity,
                                'remaining' => $variant->fresh()->stock_quantity,
                                'order_id' => $orderId,
                            ]);
                        }
                    }
                }

                // ✅ Đánh dấu coupon đã dùng
                if ($order->coupon_id) {
                    $coupon = Coupon::find($order->coupon_id);
                    if ($coupon && !$coupon->used) {
                        $coupon->used = true;
                        $coupon->save();
                        
                        Log::info('Coupon marked as used after VNPay payment', [
                            'coupon_id' => $coupon->id,
                            'coupon_code' => $coupon->code,
                            'order_id' => $orderId
                        ]);
                    }
                }

                // ✅ Xóa cart items
                $variantIds = $order->items->pluck('variant_id')->filter()->unique();
                if ($variantIds->isNotEmpty()) {
                    CartItem::whereIn('variant_id', $variantIds)
                        ->whereHas('cart', fn($q) => $q->where('user_id', $order->user_id))
                        ->delete();
                        
                    Log::info('Cart items cleared after VNPay payment', [
                        'order_id' => $orderId,
                        'user_id' => $order->user_id
                    ]);
                }

                // ✅ Cập nhật shipping status
                if ($order->shipping) {
                    $order->shipping->shipping_status = 'pending';
                    $order->shipping->save();
                }

                Log::info('VNPay IPN: Payment successful', [
                    'order_id' => $orderId,
                    'transaction_id' => $transaction->id,
                    'transaction_status' => 'success',
                    'order_status' => 'confirmed',
                    'payment_status' => 'paid',
                ]);
                
                DB::commit();
                return response()->json(['RspCode' => '00', 'Message' => 'Success']);
                
            } else {
                // ❌ THANH TOÁN THẤT BẠI
                
                // Tìm transaction pending và cập nhật
                $transaction = PaymentTransaction::where('order_id', $orderId)
                    ->where('status', 'pending')
                    ->first();

                if ($transaction) {
                    $transaction->update([
                        'transaction_code' => $transactionNo ?: 'FAILED_' . $orderId . '_' . time(),
                        'amount' => $vnpAmount,
                        'status' => 'failed',
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
                } else {
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
                }

                // ✅ CẬP NHẬT ORDER
                $order->payment_status = 'failed';
                $order->status = 'payment_failed';
                $order->save();

                // ✅ KHÔNG CẦN HOÀN STOCK (vì chưa trừ)
                Log::info('VNPay payment failed - no stock to restore', [
                    'order_id' => $orderId,
                    'reason' => 'Stock was not deducted on order creation'
                ]);

                Log::warning('VNPay IPN: Payment failed', [
                    'order_id' => $orderId,
                    'response_code' => $responseCode,
                    'transaction_status' => 'failed',
                    'order_status' => 'payment_failed',
                    'payment_status' => 'failed',
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
     * Return URL từ VNPay
     */
    public function vnpay_return(Request $request)
    {
        $input = $request->all();
        $vnp_HashSecret = config('services.vnpay.hash_secret');

        Log::info('VNPay Return URL called', $input);

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
                'status' => 'error',
                'message' => 'Xác thực không thành công',
                'detail' => 'Chữ ký giao dịch không hợp lệ. Vui lòng liên hệ bộ phận hỗ trợ nếu số tiền đã bị trừ khỏi tài khoản.'
            ], 400);
        }

        $txnRef = $input['vnp_TxnRef'] ?? null;
        $orderId = explode('_', $txnRef)[0] ?? null;
        $responseCode = $input['vnp_ResponseCode'] ?? '';
        $amount = isset($input['vnp_Amount']) ? intval($input['vnp_Amount']) / 100 : 0;
        $bankCode = $input['vnp_BankCode'] ?? '';
        $bankTranNo = $input['vnp_BankTranNo'] ?? '';
        $transactionNo = $input['vnp_TransactionNo'] ?? '';

        $order = Order::with('transactions')->find($orderId);
        if (!$order) {
            return response()->json([
                'success' => false,
                'status' => 'not_found',
                'message' => 'Không tìm thấy đơn hàng',
                'detail' => 'Mã đơn hàng không tồn tại trong hệ thống.'
            ], 404);
        }

        $isSuccess = $responseCode === '00';
        $status = $isSuccess ? 'success' : 'failed';
        $message = $this->getVNPayErrorMessage($responseCode);
        
        // Log transaction for reference
        if ($isSuccess) {
            Log::info('VNPay Return - Payment Successful', [
                'order_id' => $orderId,
                'amount' => $amount,
                'transaction_no' => $transactionNo,
                'bank_code' => $bankCode,
                'bank_tran_no' => $bankTranNo
            ]);
        } else {
            Log::warning('VNPay Return - Payment Failed', [
                'order_id' => $orderId,
                'response_code' => $responseCode,
                'message' => $message
            ]);
        }

        return response()->json([
            'success' => $isSuccess,
            'status' => $status,
            'message' => $isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
            'detail' => $message,
            'data' => [
                'order_id' => $orderId,
                'order_code' => $order->code,
                'amount' => $amount,
                'transaction_no' => $transactionNo,
                'bank_code' => $bankCode,
                'payment_method' => 'VNPay',
                'paid_at' => now()->toDateTimeString(),
                'response_code' => $responseCode,
                'payment_status' => $order->payment_status,
                'order_status' => $order->status,
            ]
        ]);
    }

    /**
     * Kiểm tra trạng thái thanh toán
     */
    public function check_payment_status($orderId)
    {
        try {
            $order = Order::with(['paymentTransaction'])->findOrFail($orderId);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->id,
                    'payment_status' => $order->payment_status,
                    'status' => $order->status,
                    'final_amount' => $order->final_amount,
                    'paid_at' => $order->paid_at,
                    'transaction' => $order->paymentTransaction ? [
                        'id' => $order->paymentTransaction->id,
                        'transaction_code' => $order->paymentTransaction->transaction_code,
                        'status' => $order->paymentTransaction->status,
                        'amount' => $order->paymentTransaction->amount,
                        'payment_method' => $order->paymentTransaction->payment_method,
                        'bank_code' => $order->paymentTransaction->bank_code,
                        'paid_at' => $order->paymentTransaction->paid_at,
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
     * Lấy danh sách giao dịch của đơn hàng
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
     * Lấy tất cả giao dịch (admin)
     */
    public function get_all_transactions(Request $request)
    {
        try {
            $query = PaymentTransaction::with('order')
                ->orderBy('created_at', 'desc');

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('payment_method')) {
                $query->where('payment_method', $request->payment_method);
            }

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
     * Lấy thông điệp lỗi VNPay
     */
    private function getVNPayErrorMessage($code)
    {
        $messages = [
            '00' => [
                'short' => 'Giao dịch thành công',
                'detail' => 'Thanh toán của bạn đã được xử lý thành công. Đơn hàng đang được xử lý.'
            ],
            '07' => [
                'short' => 'Giao dịch đang được xử lý',
                'detail' => 'Giao dịch của bạn đang được xử lý. Vui lòng kiểm tra lại sau ít phút hoặc liên hệ bộ phận hỗ trợ nếu cần thiết.'
            ],
            '09' => [
                'short' => 'Thẻ/Tài khoản chưa đăng ký Internet Banking',
                'detail' => 'Thẻ hoặc tài khoản của bạn chưa đăng ký dịch vụ Internet Banking. Vui lòng kiểm tra lại hoặc chọn phương thức thanh toán khác.'
            ],
            '10' => [
                'short' => 'Xác thực thất bại',
                'detail' => 'Bạn đã nhập sai thông tin xác thực quá số lần cho phép. Vui lòng thử lại sau ít phút.'
            ],
            '11' => [
                'short' => 'Hết hạn thanh toán',
                'detail' => 'Đã hết thời gian cho phép thanh toán. Vui lòng thực hiện lại giao dịch.'
            ],
            '12' => [
                'short' => 'Thẻ/Tài khoản bị khóa',
                'detail' => 'Thẻ hoặc tài khoản của bạn đã bị khóa. Vui lòng liên hệ ngân hàng để biết thêm chi tiết.'
            ],
            '13' => [
                'short' => 'Sai OTP',
                'detail' => 'Mã OTP xác thực không chính xác. Vui lòng thử lại.'
            ],
            '24' => [
                'short' => 'Đã hủy thanh toán',
                'detail' => 'Bạn đã hủy giao dịch thanh toán. Nếu cần hỗ trợ, vui lòng liên hệ bộ phận chăm sóc khách hàng.'
            ],
            '51' => [
                'short' => 'Số dư không đủ',
                'detail' => 'Tài khoản của bạn không đủ số dư để thực hiện giao dịch. Vui lòng kiểm tra lại số dư tài khoản.'
            ],
            '65' => [
                'short' => 'Vượt hạn mức giao dịch',
                'detail' => 'Tài khoản của bạn đã vượt quá hạn mức giao dịch trong ngày. Vui lòng thử lại vào ngày mai hoặc liên hệ ngân hàng để biết thêm chi tiết.'
            ],
            '75' => [
                'short' => 'Ngân hàng đang bảo trì',
                'detail' => 'Ngân hàng thanh toán đang trong thời gian bảo trì. Vui lòng thử lại sau ít phút hoặc chọn phương thức thanh toán khác.'
            ],
            '79' => [
                'short' => 'Nhập sai mật khẩu quá số lần',
                'detail' => 'Bạn đã nhập sai mật khẩu thanh toán quá số lần cho phép. Vui lòng thử lại sau ít phút.'
            ],
            '99' => [
                'short' => 'Lỗi không xác định',
                'detail' => 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ nếu vấn đề vẫn còn.'
            ],
        ];

        $defaultMessage = [
            'short' => 'Lỗi không xác định',
            'detail' => 'Đã xảy ra lỗi trong quá trình xử lý. Mã lỗi: ' . $code
        ];

        return $messages[$code] ?? $defaultMessage;
    }
}