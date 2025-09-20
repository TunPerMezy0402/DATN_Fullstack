{{-- Nút quay lại --}}
<a href="{{ route('admin.cinemas.index') }}" class="btn btn-danger btn-sm mb-3">
    <i class="fas fa-arrow-left me-1"></i> Quay lại
</a>

{{-- Thông báo thành công --}}
@if(session('success'))
<div class="alert alert-success mt-3 success-alert">
    <i class="fas fa-check-circle me-2"></i>
    {{ session('success') }}
</div>
@endif

<div class="card mb-4 shadow-sm border-0">
    <div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-2">
        {{-- Các nút bên trái --}}
        <div class="d-flex flex-wrap gap-2">
            <a href="{{ route('admin.cinemas.schedules.index', $cinema->id) }}"
                class="btn btn-outline-primary btn-sm rounded-pill d-flex align-items-center px-3">
                <i class="fas fa-calendar-alt me-1"></i>Lịch Chiếu
            </a>

            <a href="{{ route('admin.cinemas.movies.index', $cinema->id) }}"
                class="btn btn-outline-success btn-sm rounded-pill d-flex align-items-center px-3">
                <i class="fas fa-film me-1"></i>Phim
            </a>

            <a href="{{ route('admin.cinemas.rooms.index', $cinema->id) }}"
                class="btn btn-outline-info btn-sm rounded-pill d-flex align-items-center px-3">
                <i class="fas fa-door-open me-1"></i>Phòng
            </a>

            <a href="{{ route('admin.cinemas.schedule_times.index', $cinema->id) }}"
                class="btn btn-outline-info btn-sm rounded-pill d-flex align-items-center px-3">
                <i class="fas fa-door-open me-1"></i>Giờ Chiếu
            </a>
        </div>

        {{-- Thông tin rạp bên phải --}}
        <div class="text-end">
            <h5 class="card-title text-primary mb-1">
                🎬 {{ $cinema->name }}
            </h5>
            <p class="text-muted mb-0">
                📍 {{ $cinema->address ?? 'Chưa cập nhật địa chỉ' }}
            </p>
        </div>
    </div>
</div>