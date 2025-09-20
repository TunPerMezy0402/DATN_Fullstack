@extends('layouts.app')

@section('content')
<div class="container">

    <!-- Banner -->
    <div class="mb-5">
        <div class="p-5 text-white text-center rounded" style="background: url('https://via.placeholder.com/1200x400?text=SALE+50%25+Sneaker') center/cover no-repeat;">
            <h1 class="fw-bold">Chào mừng đến với Sneaker Store</h1>
            <p class="lead">Khuyến mãi HOT - Giảm đến 50% cho các mẫu giày mới nhất</p>
            <a href="#products" class="btn btn-danger btn-lg">Mua ngay</a>
        </div>
    </div>

    <!-- Danh sách sản phẩm -->
    <div id="products" class="mb-5">
        <h2 class="text-center mb-4">Sản Phẩm Nổi Bật</h2>
        <div class="row">
            <!-- Sản phẩm 1 -->
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <img src="https://via.placeholder.com/400x300?text=Nike+Air+Max" class="card-img-top" alt="Nike Air Max">
                    <div class="card-body">
                        <h5 class="card-title">Nike Air Max</h5>
                        <p class="card-text">Giày thể thao cao cấp, êm ái, phù hợp cho vận động và đi chơi.</p>
                        <p class="fw-bold text-danger">2.500.000₫</p>
                        <a href="#" class="btn btn-primary">Mua ngay</a>
                    </div>
                </div>
            </div>

            <!-- Sản phẩm 2 -->
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <img src="https://via.placeholder.com/400x300?text=Adidas+Ultraboost" class="card-img-top" alt="Adidas Ultraboost">
                    <div class="card-body">
                        <h5 class="card-title">Adidas Ultraboost</h5>
                        <p class="card-text">Công nghệ đệm Boost mang lại trải nghiệm siêu thoải mái.</p>
                        <p class="fw-bold text-danger">3.000.000₫</p>
                        <a href="#" class="btn btn-primary">Mua ngay</a>
                    </div>
                </div>
            </div>

            <!-- Sản phẩm 3 -->
            <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <img src="https://via.placeholder.com/400x300?text=Converse+Classic" class="card-img-top" alt="Converse Classic">
                    <div class="card-body">
                        <h5 class="card-title">Converse Classic</h5>
                        <p class="card-text">Thiết kế trẻ trung, đơn giản và dễ phối đồ.</p>
                        <p class="fw-bold text-danger">1.200.000₫</p>
                        <a href="#" class="btn btn-primary">Mua ngay</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-dark text-white text-center py-4 rounded">
        <p class="mb-1">&copy; 2025 Sneaker Store. All rights reserved.</p>
        <p class="mb-0">Liên hệ: <a href="mailto:sneaker@shop.com" class="text-white">sneaker@shop.com</a> | Hotline: 0123 456 789</p>
    </footer>

</div>
@endsection
