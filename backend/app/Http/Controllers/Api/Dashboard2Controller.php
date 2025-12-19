<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class Dashboard2Controller extends Controller
{
    /**
     * GET /api/admin/dashboard2/stats
     * Lấy thống kê đơn hàng và doanh thu cho Dashboard 2
     */
    public function getStats(Request $request)
    {
        try {
            // Lấy tham số thời gian
            $timeFilter = $request->query('time_filter', 'month');
            $startDate = $request->query('start_date');
            $endDate = $request->query('end_date');

            // Xác định khoảng thời gian
            $dateRange = $this->getDateRange($timeFilter, $startDate, $endDate);

            // 1. Thống kê tổng quan đơn hàng
            $orderStats = $this->getOrderStats($dateRange);

            // 2. Thống kê doanh thu chi tiết
            $revenueStats = $this->getRevenueStats($dateRange);

            // 3. Thống kê tình trạng vận chuyển
            $shippingStats = $this->getShippingStats($dateRange);

            // 4. Biểu đồ doanh thu theo ngày
            $revenueByDay = $this->getRevenueByDay($dateRange, $timeFilter);

            // 5. Đơn hàng gần đây
            $recentOrders = $this->getRecentOrders($dateRange, 10);

            return response()->json([
                'success' => true,
                'data' => [
                    'time_filter' => $timeFilter,
                    'date_range' => $dateRange,
                    'order_stats' => $orderStats,
                    'revenue_stats' => $revenueStats,
                    'shipping_stats' => $shippingStats,
                    'revenue_by_day' => $revenueByDay,
                    'recent_orders' => $recentOrders,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Dashboard2 getStats error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Không thể lấy thống kê',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xác định khoảng thời gian
     */
    private function getDateRange($timeFilter, $startDate = null, $endDate = null)
    {
        $now = Carbon::now();
        
        switch ($timeFilter) {
            case 'today':
                return [
                    'start' => $now->copy()->startOfDay()->toDateTimeString(),
                    'end' => $now->copy()->endOfDay()->toDateTimeString()
                ];
            
            case 'week':
                return [
                    'start' => $now->copy()->startOfWeek()->toDateTimeString(),
                    'end' => $now->copy()->endOfWeek()->toDateTimeString()
                ];
            
            case 'month':
                return [
                    'start' => $now->copy()->startOfMonth()->toDateTimeString(),
                    'end' => $now->copy()->endOfMonth()->toDateTimeString()
                ];
            
            case 'year':
                return [
                    'start' => $now->copy()->startOfYear()->toDateTimeString(),
                    'end' => $now->copy()->endOfYear()->toDateTimeString()
                ];
            
            case 'custom':
                if ($startDate && $endDate) {
                    return [
                        'start' => Carbon::parse($startDate)->startOfDay()->toDateTimeString(),
                        'end' => Carbon::parse($endDate)->endOfDay()->toDateTimeString()
                    ];
                }
                return [
                    'start' => $now->copy()->startOfMonth()->toDateTimeString(),
                    'end' => $now->copy()->endOfMonth()->toDateTimeString()
                ];
            
            default:
                return [
                    'start' => $now->copy()->startOfMonth()->toDateTimeString(),
                    'end' => $now->copy()->endOfMonth()->toDateTimeString()
                ];
        }
    }

    /**
     * Thống kê tổng quan đơn hàng
     */
    private function getOrderStats($dateRange)
    {
        $query = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        
        $totalOrders = (clone $query)->count();
        
        // Tính tổng doanh thu
        $totalRevenue = (clone $query)->sum('final_amount') ?: 0;
        
        // Tính doanh thu kỳ trước
        $previousPeriod = $this->getPreviousPeriod($dateRange);
        $previousRevenue = Order::whereBetween('created_at', [$previousPeriod['start'], $previousPeriod['end']])
            ->sum('final_amount') ?: 0;
        
        $revenueGrowth = $previousRevenue > 0 
            ? round((($totalRevenue - $previousRevenue) / $previousRevenue) * 100, 2)
            : 0;
        
        // Đếm đơn đã giao
        $deliveredOrders = (clone $query)
            ->whereHas('shipping', function($q) {
                $q->whereIn('shipping_status', ['delivered', 'received', 'evaluated']);
            })
            ->count();
        
        $orderCompletionRate = $totalOrders > 0 
            ? round(($deliveredOrders / $totalOrders) * 100, 2)
            : 0;

        return [
            'total_orders' => (int)$totalOrders,
            'total_revenue' => (int)round($totalRevenue),
            'previous_revenue' => (int)round($previousRevenue),
            'revenue_growth' => (float)$revenueGrowth,
            'delivered_orders' => (int)$deliveredOrders,
            'order_completion_rate' => (float)$orderCompletionRate,
        ];
    }

    /**
     * Thống kê doanh thu chi tiết
     */
    private function getRevenueStats($dateRange)
    {
        $query = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        
        // Đã thanh toán (không có return request hoặc return bị rejected)
        $paidAmount = (clone $query)
            ->where('payment_status', 'paid')
            ->where(function($q) {
                $q->whereDoesntHave('returnRequests')
                  ->orWhereHas('returnRequests', function($subQ) {
                      $subQ->where('status', 'rejected');
                  });
            })
            ->sum('final_amount') ?: 0;
        
        // Chưa thanh toán
        $unpaidAmount = (clone $query)
            ->where('payment_status', 'unpaid')
            ->sum('final_amount') ?: 0;
        
        // VNPay chưa thanh toán
        $vnpayUnpaidAmount = (clone $query)
            ->where('payment_status', 'unpaid')
            ->where('payment_method', 'vnpay')
            ->sum('final_amount') ?: 0;
        
        // Đã hoàn tiền (return requests completed)
        $refundedOrders = (clone $query)
            ->whereHas('returnRequests', function($q) {
                $q->where('status', 'completed');
            })
            ->get();
        
        $refundedAmount = 0;
        foreach ($refundedOrders as $order) {
            $refundedAmount += $order->returnRequests()
                ->where('status', 'completed')
                ->sum('estimated_refund') ?: 0;
        }
        
        // Cần hoàn tiền (return requests pending/approved)
        $pendingRefundOrders = (clone $query)
            ->whereHas('returnRequests', function($q) {
                $q->whereIn('status', ['pending', 'approved']);
            })
            ->get();
        
        $pendingRefundAmount = 0;
        foreach ($pendingRefundOrders as $order) {
            $pendingRefundAmount += $order->returnRequests()
                ->whereIn('status', ['pending', 'approved'])
                ->sum('estimated_refund') ?: 0;
        }
        
        // Tiền COD cần thu (đã giao nhưng chưa thanh toán)
        $codPendingAmount = (clone $query)
            ->where('payment_method', 'cod')
            ->where('payment_status', 'unpaid')
            ->whereHas('shipping', function($q) {
                $q->where('shipping_status', 'delivered');
            })
            ->sum('final_amount') ?: 0;

        // Tổng tiền đã giảm giá từ coupon
        $totalCouponDiscount = (clone $query)
            ->whereNotNull('coupon_id')
            ->sum(DB::raw('COALESCE(discount_amount, 0)')) ?: 0;

        return [
            'paid_amount' => (int)round($paidAmount),
            'unpaid_amount' => (int)round($unpaidAmount),
            'vnpay_unpaid_amount' => (int)round($vnpayUnpaidAmount),
            'refunded_amount' => (int)round($refundedAmount),
            'pending_refund_amount' => (int)round($pendingRefundAmount),
            'cod_pending_amount' => (int)round($codPendingAmount),
            'total_coupon_discount' => (int)round($totalCouponDiscount),
        ];
    }

    /**
     * Thống kê tình trạng vận chuyển
     */
    private function getShippingStats($dateRange)
    {
        $query = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        
        // Đã giao hàng
        $delivered = (clone $query)
            ->whereHas('shipping', function($q) {
                $q->whereIn('shipping_status', ['delivered', 'received', 'evaluated']);
            })
            ->count();
        
        // Đang giao
        $inTransit = (clone $query)
            ->whereHas('shipping', function($q) {
                $q->where('shipping_status', 'in_transit');
            })
            ->count();
        
        // Chờ xử lý
        $pending = (clone $query)
            ->whereHas('shipping', function($q) {
                $q->where('shipping_status', 'pending');
            })
            ->count();
        
        // Đã hủy
        $cancelled = (clone $query)
            ->whereHas('shipping', function($q) {
                $q->whereIn('shipping_status', ['none', 'cancelled', 'failed']);
            })
            ->count();

        return [
            'delivered_orders' => (int)$delivered,
            'in_transit_orders' => (int)$inTransit,
            'pending_orders' => (int)$pending,
            'cancelled_orders' => (int)$cancelled,
        ];
    }

    /**
     * Biểu đồ doanh thu theo ngày
     */
    private function getRevenueByDay($dateRange, $timeFilter)
    {
        // Xác định format group by
        $groupByFormat = $this->getGroupByFormat($timeFilter);
        
        $data = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->select(
                DB::raw($groupByFormat . ' as date'),
                DB::raw('ROUND(SUM(final_amount)) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function($item) use ($timeFilter) {
                // Format date theo timeFilter
                $dateFormat = $this->getDateFormat($timeFilter, $item->date);
                
                return [
                    'date' => $dateFormat,
                    'revenue' => (int)($item->revenue ?: 0),
                    'orders' => (int)($item->orders ?: 0)
                ];
            });

        return $data;
    }

    /**
     * Helper: Format group by theo timeFilter
     */
    private function getGroupByFormat($timeFilter)
    {
        switch ($timeFilter) {
            case 'today':
            case 'week':
                return "DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')";
            case 'month':
                return "DATE(created_at)";
            case 'year':
                return "DATE_FORMAT(created_at, '%Y-%m')";
            default:
                return "DATE(created_at)";
        }
    }

    /**
     * Helper: Format date hiển thị
     */
    private function getDateFormat($timeFilter, $date)
    {
        $carbon = Carbon::parse($date);
        
        switch ($timeFilter) {
            case 'today':
            case 'week':
                return $carbon->format('H:i');
            case 'month':
                return $carbon->format('d/m');
            case 'year':
                return $carbon->format('m/Y');
            default:
                return $carbon->format('d/m/Y');
        }
    }

    /**
     * Đơn hàng gần đây
     */
    private function getRecentOrders($dateRange, $limit = 10)
    {
        $orders = Order::with(['user', 'shipping', 'returnRequests'])
            ->whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function($order) {
                return $this->formatOrder($order);
            });

        return $orders;
    }

    /**
     * Format order với actual payment status và refund info
     */
    private function formatOrder($order)
    {
        // Xác định trạng thái thanh toán thực tế
        $actualPaymentStatus = $this->getActualPaymentStatus($order);
        
        // Tính refund info
        $refundInfo = $this->calculateRefundInfo($order);

        return [
            'id' => $order->id,
            'sku' => $order->sku,
            'user_name' => $order->user->name ?? null,
            'total_amount' => (int)round($order->total_amount ?: 0),
            'final_amount' => (int)round($order->final_amount ?: 0),
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'actual_payment_status' => $actualPaymentStatus,
            'shipping_status' => $order->shipping->shipping_status ?? 'pending',
            'created_at' => $order->created_at->toDateTimeString(),
            'refund_info' => $refundInfo,
        ];
    }

    /**
     * Lấy actual payment status dựa trên return requests
     */
    private function getActualPaymentStatus($order): string
    {
        if ($order->returnRequests->isEmpty()) {
            return $order->payment_status;
        }

        // Kiểm tra có return request completed
        $hasCompletedReturn = $order->returnRequests->contains('status', 'completed');
        if ($hasCompletedReturn) {
            return 'refunded';
        }

        // Kiểm tra có return request processing
        $hasProcessingReturn = $order->returnRequests
            ->whereIn('status', ['pending', 'approved'])
            ->isNotEmpty();
        if ($hasProcessingReturn) {
            return 'refund_processing';
        }

        return $order->payment_status;
    }

    /**
     * Tính refund info
     */
    private function calculateRefundInfo($order): array
    {
        $returnRequests = $order->returnRequests;

        if ($returnRequests->isEmpty()) {
            return [
                'has_return_request' => false,
                'total_refund_needed' => 0,
                'total_refunded' => 0,
            ];
        }

        $actualPaymentStatus = $this->getActualPaymentStatus($order);

        // Nếu đang refund_processing: tính tổng estimated_refund của pending/approved
        if ($actualPaymentStatus === 'refund_processing') {
            $totalRefundNeeded = $returnRequests
                ->whereIn('status', ['pending', 'approved'])
                ->sum('estimated_refund') ?: 0;

            return [
                'has_return_request' => true,
                'total_refund_needed' => (int)round($totalRefundNeeded),
                'total_refunded' => 0,
            ];
        }

        // Nếu đã refunded: tính tổng estimated_refund của completed
        if ($actualPaymentStatus === 'refunded') {
            $totalRefunded = $returnRequests
                ->where('status', 'completed')
                ->sum('estimated_refund') ?: 0;

            return [
                'has_return_request' => true,
                'total_refund_needed' => 0,
                'total_refunded' => (int)round($totalRefunded),
            ];
        }

        return [
            'has_return_request' => true,
            'total_refund_needed' => 0,
            'total_refunded' => 0,
        ];
    }

    /**
     * Helper: Lấy kỳ trước
     */
    private function getPreviousPeriod($dateRange)
    {
        $start = Carbon::parse($dateRange['start']);
        $end = Carbon::parse($dateRange['end']);
        $diff = $start->diffInDays($end);

        return [
            'start' => $start->copy()->subDays($diff + 1)->toDateTimeString(),
            'end' => $end->copy()->subDays($diff + 1)->toDateTimeString()
        ];
    }
}