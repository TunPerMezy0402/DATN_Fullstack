<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác nhận đơn hàng</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #666;
        }
        .value {
            color: #333;
            text-align: right;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        table th {
            background-color: #f0f0f0;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
        }
        table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        table tr:last-child td {
            border-bottom: none;
        }
        .item-image {
            max-width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 4px;
        }
        .total-section {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
        }
        .total-row.final {
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
            border-top: 2px solid #ddd;
            padding-top: 12px;
            margin-top: 12px;
        }
        .shipping-info {
            background-color: #f0f7ff;
            padding: 15px;
            border-left: 4px solid #667eea;
            border-radius: 4px;
        }
        .address {
            margin: 10px 0;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
            text-align: center;
            font-weight: 600;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
        }
        .badge {
            display: inline-block;
            background-color: #e8f5e9;
            color: #2e7d32;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.pending {
            background-color: #fff3e0;
            color: #e65100;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>✅ Đơn Hàng Được Xác Nhận</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Cảm ơn bạn đã đặt hàng!</p>
        </div>

        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <p style="font-size: 16px; margin-bottom: 20px;">
                Xin chào <strong>{{ $user->name }}</strong>,
            </p>
            <p style="color: #666; margin-bottom: 20px;">
                Chúng tôi đã nhận được đơn hàng của bạn. Đơn hàng sẽ được xử lý và giao đến bạn sớm nhất có thể.
            </p>

            <!-- Order Information -->
            <div class="section">
                <div class="section-title">📋 Thông Tin Đơn Hàng</div>
                <div class="info-row">
                    <span class="label">Mã đơn hàng:</span>
                    <span class="value"><strong>#{{ $order->sku }}</strong></span>
                </div>
                <div class="info-row">
                    <span class="label">Ngày đặt:</span>
                    <span class="value">{{ $order->created_at->format('d/m/Y H:i') }}</span>
                </div>
                <div class="info-row">
                    <span class="label">Phương thức thanh toán:</span>
                    <span class="value">
                        @if($order->payment_method === 'cod')
                            Thanh toán khi nhận hàng
                        @elseif($order->payment_method === 'vnpay')
                            VNPAY
                        @else
                            {{ ucfirst($order->payment_method) }}
                        @endif
                    </span>
                </div>
                <div class="info-row">
                    <span class="label">Trạng thái thanh toán:</span>
                    <span class="value">
                        @if($order->payment_status === 'paid')
                            <span class="badge">Đã thanh toán</span>
                        @else
                            <span class="badge pending">Chưa thanh toán</span>
                        @endif
                    </span>
                </div>
            </div>

            <!-- Items -->
            <div class="section">
                <div class="section-title">📦 Sản Phẩm Đặt Hàng</div>
                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th style="text-align: center;">Số lượng</th>
                            <th style="text-align: right;">Giá</th>
                            <th style="text-align: right;">Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($items as $item)
                            <tr>
                                <td>
                                    @if($item->product_image)
                                        <img src="{{ $item->product_image }}" alt="{{ $item->product_name }}" class="item-image" style="margin-right: 10px; vertical-align: top;">
                                    @endif
                                    <strong>{{ $item->product_name }}</strong>
                                    @if($item->size || $item->color)
                                        <br>
                                        <span style="font-size: 12px; color: #999;">
                                            @if($item->size) Size: {{ $item->size }} @endif
                                            @if($item->color) | Màu: {{ $item->color }} @endif
                                        </span>
                                    @endif
                                </td>
                                <td style="text-align: center;">{{ $item->quantity }}</td>
                                <td style="text-align: right;">{{ number_format($item->price, 0) }}₫</td>
                                <td style="text-align: right;">{{ number_format($item->quantity * $item->price, 0) }}₫</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <!-- Total -->
            <div class="section">
                <div class="total-section">
                    <div class="total-row">
                        <span>Tổng tiền:</span>
                        <span>{{ number_format($order->total_amount, 0) }}₫</span>
                    </div>
                    @if($order->discount_amount > 0)
                        <div class="total-row">
                            <span>Giảm giá:</span>
                            <span>-{{ number_format($order->discount_amount, 0) }}₫</span>
                        </div>
                    @endif
                    <div class="total-row">
                        <span>Phí vận chuyển:</span>
                        <span>{{ number_format($shipping->shipping_fee ?? 0, 0) }}₫</span>
                    </div>
                    <div class="total-row final">
                        <span>Tổng cộng:</span>
                        <span>{{ number_format($order->final_amount, 0) }}₫</span>
                    </div>
                </div>
            </div>

            <!-- Shipping Info -->
            <div class="section">
                <div class="section-title">🚚 Thông Tin Giao Hàng</div>
                <div class="shipping-info">
                    <div class="info-row" style="border: none; padding: 0;">
                        <span class="label">Người nhận:</span>
                        <span class="value">{{ $shipping->shipping_name }}</span>
                    </div>
                    <div class="info-row" style="border: none; padding: 5px 0;">
                        <span class="label">Điện thoại:</span>
                        <span class="value">{{ $shipping->shipping_phone }}</span>
                    </div>
                    <div class="address">
                        <strong>Địa chỉ giao hàng:</strong><br>
                        @if($shipping->village)
                            {{ $shipping->village }}, 
                        @endif
                        {{ $shipping->commune }}, {{ $shipping->district }}, {{ $shipping->city }}
                    </div>
                    @if($shipping->notes)
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 14px;">
                            <strong>Ghi chú:</strong> {{ $shipping->notes }}
                        </div>
                    @endif
                </div>
            </div>

            <!-- Next Steps -->
            <div class="section">
                <div class="section-title">⏭️ Bước Tiếp Theo</div>
                <ol style="color: #666; line-height: 1.8;">
                    <li>Chúng tôi sẽ xác nhận và chuẩn bị hàng hóa của bạn</li>
                    <li>Sản phẩm sẽ được giao đến địa chỉ trên trong 2-3 ngày làm việc</li>
                    <li>Bạn sẽ nhận được thông báo khi hàng đang trên đường</li>
                    <li>Vui lòng kiểm tra sản phẩm khi nhận hàng</li>
                </ol>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
                <a href="{{ env('FRONTEND_URL') }}/orders/{{ $order->id }}" class="button">
                    Xem Chi Tiết Đơn Hàng
                </a>
            </div>

            <!-- Support -->
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 4px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px;">
                    <strong>Có câu hỏi?</strong><br>
                    Liên hệ chúng tôi qua email hoặc số điện thoại trong website nếu bạn cần hỗ trợ.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p style="margin: 0;">
                © {{ date('Y') }} Cửa hàng của chúng tôi. Tất cả các quyền được bảo vệ.
            </p>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">
                Đây là email tự động, vui lòng không trả lời email này.
            </p>
        </div>
    </div>
</body>
</html>