<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Category;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class Dashboard1Controller extends Controller
{
    /**
     * GET /api/admin/dashboard1/stats
     * Lấy thống kê tổng quan cho Dashboard 1
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

            // 1. Thống kê doanh thu
            $revenueStats = $this->getRevenueStats($dateRange);

            // 2. Top sản phẩm bán chạy (theo số lượng)
            $topProductsBySales = $this->getTopProducts($dateRange, 10);

            // 3. Top sản phẩm giá cao nhất
            $topProductsByPrice = $this->getTopProductsByPrice($dateRange, 10);

            // 4. Top danh mục bán chạy (cho biểu đồ tròn)
            $topCategories = $this->getTopCategories($dateRange);

            // 5. Biểu đồ doanh thu theo thời gian
            $revenueChart = $this->getRevenueChart($dateRange, $timeFilter);

            // 6. Thống kê người dùng
            $usersStats = $this->getUsersStats($dateRange);

            // 7. Thống kê coupon
            $couponStats = $this->getCouponStats($dateRange);

            // 8. Thống kê chi tiết sản phẩm
            $productStats = $this->getProductStats($dateRange);

            // 9. Thống kê tổng hệ thống
            $systemStats = $this->getSystemStats();

            return response()->json([
                'success' => true,
                'data' => [
                    'time_filter' => $timeFilter,
                    'date_range' => $dateRange,
                    'revenue' => $revenueStats,
                    'top_products_by_sales' => $topProductsBySales,
                    'top_products_by_price' => $topProductsByPrice,
                    'top_categories' => $topCategories,
                    'revenue_chart' => $revenueChart,
                    'users' => $usersStats,
                    'coupons' => $couponStats,
                    'products' => $productStats,
                    'system' => $systemStats,
                ]
            ], 200);

        } catch (\Exception $e) {
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
                // Fallback to month if custom dates not provided
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
     * Thống kê doanh thu - Format số nguyên VNĐ
     */
    private function getRevenueStats($dateRange)
    {
        $query = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']]);
        
        // Doanh thu đã thanh toán
        $paidRevenue = (clone $query)
            ->where('payment_status', 'paid')
            ->where(function($q) {
                $q->whereDoesntHave('returnRequests')
                  ->orWhereHas('returnRequests', function($subQ) {
                      $subQ->where('status', 'rejected');
                  });
            })
            ->sum('final_amount');
        
        // Doanh thu chưa thanh toán
        $unpaidRevenue = (clone $query)->where('payment_status', 'unpaid')->sum('final_amount');
        
        // Doanh thu đang xử lý hoàn tiền
        $refundProcessingRevenue = (clone $query)
            ->whereHas('returnRequests', function($q) {
                $q->whereIn('status', ['pending', 'approved']);
            })
            ->sum('final_amount');
        
        // Doanh thu đã hoàn
        $refundedRevenue = (clone $query)
            ->whereHas('returnRequests', function($q) {
                $q->where('status', 'completed');
            })
            ->sum('final_amount');
        
        // Tổng doanh thu = paid - refunded (làm tròn)
        $totalRevenue = round($paidRevenue - $refundedRevenue);
        
        // Tính doanh thu kỳ trước
        $previousPeriod = $this->getPreviousPeriod($dateRange);
        $previousQuery = Order::whereBetween('created_at', [$previousPeriod['start'], $previousPeriod['end']]);
        
        $previousPaid = (clone $previousQuery)
            ->where('payment_status', 'paid')
            ->where(function($q) {
                $q->whereDoesntHave('returnRequests')
                  ->orWhereHas('returnRequests', function($subQ) {
                      $subQ->where('status', 'rejected');
                  });
            })
            ->sum('final_amount');
            
        $previousRefunded = (clone $previousQuery)
            ->whereHas('returnRequests', function($q) {
                $q->where('status', 'completed');
            })
            ->sum('final_amount');
            
        $previousRevenue = round($previousPaid - $previousRefunded);
        
        $revenueGrowth = $previousRevenue > 0 
            ? round((($totalRevenue - $previousRevenue) / $previousRevenue) * 100, 2)
            : 0;
        
        return [
            'total' => (int)$totalRevenue,
            'paid' => (int)round($paidRevenue),
            'unpaid' => (int)round($unpaidRevenue),
            'refund_processing' => (int)round($refundProcessingRevenue),
            'refunded' => (int)round($refundedRevenue),
            'previous_period' => (int)$previousRevenue,
            'growth_rate' => $revenueGrowth
        ];
    }

    /**
     * Top sản phẩm bán chạy - Sắp xếp theo số lượng đã bán
     */
    private function getTopProducts($dateRange, $limit = 10)
    {
        $products = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('shipping', 'orders.id', '=', 'shipping.order_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('shipping.shipping_status', ['delivered', 'received', 'evaluated', 'in_transit'])
            ->select(
                'products.id',
                'products.name',
                'products.image',
                DB::raw('SUM(order_items.quantity) as total_sold'),
                DB::raw('ROUND(SUM(order_items.quantity * order_items.price)) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.image')
            ->orderByDesc('total_sold')
            ->limit($limit)
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'image' => $item->image,
                    'total_sold' => (int)$item->total_sold,
                    'revenue' => (int)$item->revenue
                ];
            });

        return $products;
    }

    /**
     * Top sản phẩm giá cao nhất - Sắp xếp theo doanh thu
     */
    private function getTopProductsByPrice($dateRange, $limit = 10)
    {
        $products = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('shipping', 'orders.id', '=', 'shipping.order_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('shipping.shipping_status', ['delivered', 'received', 'evaluated', 'in_transit'])
            ->select(
                'products.id',
                'products.name',
                'products.image',
                DB::raw('SUM(order_items.quantity) as total_sold'),
                DB::raw('ROUND(SUM(order_items.quantity * order_items.price)) as revenue'),
                DB::raw('ROUND(AVG(order_items.price)) as avg_price')
            )
            ->groupBy('products.id', 'products.name', 'products.image')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'image' => $item->image,
                    'total_sold' => (int)$item->total_sold,
                    'revenue' => (int)$item->revenue,
                    'avg_price' => (int)$item->avg_price
                ];
            });

        return $products;
    }

    /**
     * Top danh mục bán chạy - Cho biểu đồ tròn
     */
    private function getTopCategories($dateRange)
    {
        $categories = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->join('shipping', 'orders.id', '=', 'shipping.order_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('shipping.shipping_status', ['delivered', 'received', 'evaluated', 'in_transit'])
            ->select(
                'categories.id',
                'categories.name',
                DB::raw('SUM(order_items.quantity) as total_sold'),
                DB::raw('ROUND(SUM(order_items.quantity * order_items.price)) as revenue')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'total_sold' => (int)$item->total_sold,
                    'revenue' => (int)$item->revenue
                ];
            });

        return $categories;
    }

    /**
     * Biểu đồ doanh thu theo thời gian
     */
    private function getRevenueChart($dateRange, $timeFilter)
    {
        $groupBy = $this->getGroupByFormat($timeFilter);
        
        $data = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->where('payment_status', 'paid')
            ->where(function($q) {
                $q->whereDoesntHave('returnRequests')
                  ->orWhereHas('returnRequests', function($subQ) {
                      $subQ->where('status', 'rejected');
                  });
            })
            ->select(
                DB::raw($groupBy . ' as period'),
                DB::raw('ROUND(SUM(final_amount)) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(function($item) {
                return [
                    'period' => $item->period,
                    'revenue' => (int)$item->revenue,
                    'orders' => $item->orders
                ];
            });

        return $data;
    }

    /**
     * Thống kê người dùng - Bao gồm cả người dùng mới trong kỳ và tổng
     */
    private function getUsersStats($dateRange)
    {
        // Người dùng mới trong kỳ
        $newUsers = User::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])->count();
        
        // Người dùng mới đang hoạt động
        $newUsersActive = User::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->where('status', 'active')
            ->count();
        
        // Người dùng mới không hoạt động
        $newUsersInactive = $newUsers - $newUsersActive;
        
        // Tổng người dùng trong hệ thống
        $totalUsers = User::count();
        
        // Tổng người dùng đang hoạt động
        $totalActive = User::where('status', 'active')->count();
        
        // Tổng người dùng không hoạt động
        $totalInactive = $totalUsers - $totalActive;

        return [
            'new_users' => $newUsers,
            'new_users_active' => $newUsersActive,
            'new_users_inactive' => $newUsersInactive,
            'total_users' => $totalUsers,
            'total_active' => $totalActive,
            'total_inactive' => $totalInactive,
        ];
    }

    /**
     * Thống kê coupon
     */
    private function getCouponStats($dateRange)
    {
        $totalCoupons = Coupon::count();
        $activeCoupons = Coupon::where('is_active', true)->count();
        $inactiveCoupons = $totalCoupons - $activeCoupons;
        
        $usedCount = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereNotNull('coupon_id')
            ->count();
        
        $totalDiscount = Order::whereBetween('created_at', [$dateRange['start'], $dateRange['end']])
            ->whereNotNull('coupon_id')
            ->sum('discount_amount');

        return [
            'total' => $totalCoupons,
            'active' => $activeCoupons,
            'inactive' => $inactiveCoupons,
            'used_count' => $usedCount,
            'total_discount' => (int)round($totalDiscount)
        ];
    }

    /**
     * Thống kê chi tiết sản phẩm
     */
    private function getProductStats($dateRange)
    {
        // Tổng sản phẩm đã bán trong kỳ
        $totalSold = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('shipping', 'orders.id', '=', 'shipping.order_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('shipping.shipping_status', ['delivered', 'received', 'evaluated', 'in_transit'])
            ->sum('order_items.quantity');

        // Số loại sản phẩm đã bán (distinct)
        $totalProductsSold = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('shipping', 'orders.id', '=', 'shipping.order_id')
            ->whereBetween('orders.created_at', [$dateRange['start'], $dateRange['end']])
            ->whereIn('shipping.shipping_status', ['delivered', 'received', 'evaluated', 'in_transit'])
            ->distinct('order_items.product_id')
            ->count('order_items.product_id');

        return [
            'total_sold' => (int)$totalSold,
            'total_products_sold' => (int)$totalProductsSold,
        ];
    }

    /**
     * Thống kê tổng hệ thống
     */
    private function getSystemStats()
    {
        $totalProducts = Product::count();
        $totalCategories = Category::count();
        $totalUsers = User::count();

        return [
            'total_products' => $totalProducts,
            'total_categories' => $totalCategories,
            'total_users' => $totalUsers,
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
}