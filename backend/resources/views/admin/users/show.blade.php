@extends('layouts.AdminLayout')

@section('content')
<div class="container mt-4">

    {{-- Back button --}}
    <a href="{{ route('admin.users.index') }}" class="btn btn-danger btn-sm mb-3">
        <i class="fas fa-arrow-left me-1"></i> Back
    </a>

    {{-- Success Alert --}}
    @if(session('success'))
        <div class="alert alert-success">
            <i class="fas fa-check-circle me-1"></i> {{ session('success') }}
        </div>
    @endif

    {{-- User Info --}}
    <div class="card shadow-sm mb-4">
        <div class="card-header bg-dark">
            <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    {{ $user->name }} 
                    <small class="text-muted">(<a href="mailto:{{ $user->email }}">{{ $user->email }}</a>)</small>
                </h5>
                <div>
                    {{-- Role --}}
                    @if ($user->role === 'user')
                        <span class="badge bg-warning text-dark">{{ ucfirst($user->role) }}</span>
                    @elseif ($user->role === 'admin')
                        <span class="badge bg-info text-dark">{{ ucfirst($user->role) }}</span>
                    @else
                        <span class="badge bg-primary">{{ ucfirst($user->role) }}</span>
                    @endif

                    {{-- Status --}}
                    @if ($user->status == "0")
                        <i class="fas fa-user text-success ms-3"></i>
                    @else
                        <i class="fas fa-user-slash text-danger ms-3"></i>
                    @endif
                </div>
            </div>
        </div>

        <div class="card-body d-flex justify-content-between">
            <div>
                <i class="fas fa-hourglass-half text-success me-2"></i>
                <span class="fw-semibold">Created at:</span>
                <span class="text-muted ms-1">{{ optional($user->created_at)->format('d/m/Y H:i:s') }}</span>
            </div>

            {{-- Delete button --}}
            <form action="{{ route('admin.users.destroy', $user->id) }}" method="POST"
                onsubmit="return confirm('Bạn có chắc chắn muốn xóa người dùng này không?')">
                @csrf
                @method('DELETE')
                {{-- <button class="btn btn-sm btn-danger">
                    <i class="fas fa-trash-alt me-1"></i> Delete
                </button> --}}
            </form>
        </div>
    </div>

    {{-- Details --}}
    <div class="card shadow-sm mb-4">
        <div class="card-header bg-dark d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Details</h5>
        </div>

        <form class="card-body bg-body-tertiary" action="{{ route('admin.users.update', $user->id) }}" method="POST">
            @csrf
            @method('PUT')

            <div class="row">
                {{-- Account Info --}}
                <div class="col-lg-6">
                    <h6 class="fw-bold text-uppercase mb-3">Account Information</h6>

                    <div class="mb-2">
                        <strong>ID:</strong> {{ $user->id }}
                    </div>
                    <div class="mb-2">
                        <strong>Created:</strong> {{ optional($user->created_at)->format('H:i:s d/m/Y') }}
                    </div>
                    <div class="mb-2">
                        <strong>Phone:</strong> {{ $user->phone ?? 'N/A' }}
                    </div>
                    <div class="mb-2">
                        <strong>Email:</strong> <a href="mailto:{{ $user->email }}">{{ $user->email }}</a>
                    </div>
                    <div class="mb-3">
                        <strong>Status:</strong>
                        <select name="status" id="status" class="form-select mt-1">
                            <option value="0" {{ old('status', $user->status) == '' ? 'selected' : '' }}>Mở tài khoản</option>
                            <option value="1" {{ old('status', $user->status) == 1 ? 'selected' : '' }}>Dừng hoạt động</option>
                            <option value="2" {{ old('status', $user->status) == 2 ? 'selected' : '' }}>Khóa tài khoản</option>
                        </select>
                    </div>
                </div>

                {{-- Billing Info --}}
                <div class="col-lg-6 mt-4 mt-lg-0">
                    <h6 class="fw-bold text-uppercase mb-3">Billing Information</h6>

                    <div class="mb-2">
                        <strong>Send email to:</strong> <a href="mailto:{{ $user->email }}">{{ $user->email }}</a>
                    </div>
                    <div class="mb-2">
                        <strong>Address:</strong> {{ $user->address ?? 'N/A' }}
                    </div>
                    <div class="mb-2">
                        <strong>Phone:</strong> {{ $user->phone ?? 'N/A' }}
                    </div>
                </div>
            </div>

            <div class="card-footer text-end bg-dark">
                <button type="submit" class="btn btn-success btn-sm">
                    <i class="fas fa-save me-1"></i> Save
                </button>
            </div>
        </form>
    </div>

</div>
@endsection
