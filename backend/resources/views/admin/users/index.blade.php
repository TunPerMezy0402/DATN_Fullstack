@extends('layouts.AdminLayout')

@section('content')
@if(session('success'))
<div class="alert alert-success">
    {{ session('success') }}
</div>
@endif
<div class="card mb-3" id="customersTable" {{--
    data-list='{"valueNames":["name","email","phone","address","joined","status"]} --}}'>
    <div class="card-header">
        <div class="row flex-between-center">
            <div class="col-12 col-md-6 col-xl-5 d-flex align-items-center gap-3 flex-wrap">
                <h5 class="fs-9 mb-0 text-nowrap py-2 py-xl-0">Customers</h5>
                <form action="{{ route('admin.users.index') }}" method="GET" class="w-100 w-md-auto">
                    <div class="input-group input-group-sm">
                        <input type="text" class="form-control" name="search" placeholder="Search ..."
                            value="{{ request('search') }}">
                        <button class="btn btn-primary" type="submit">Tìm</button>
                    </div>
                </form>
            </div>
            <div class="col-8 col-sm-auto text-end ps-2">
                <div id="table-customers-replace-element">
                    <!-- Nút New -->
                    <a href="{{ route('admin.users.create') }}" class="btn btn-falcon-default btn-sm me-2">
                        <span class="fas fa-plus" data-fa-transform="shrink-3 down-2"></span>
                        <span class="d-none d-sm-inline-block ms-1">New</span>
                    </a>

                    <!-- Nút Filter -->
                    <button class="btn btn-falcon-default btn-sm me-2" type="button">
                        <span class="fas fa-filter" data-fa-transform="shrink-3 down-2"></span>
                        <span class="d-none d-sm-inline-block ms-1">Filter</span>
                    </button>

                    <!-- Nút Export -->
                    <button class="btn btn-falcon-default btn-sm" type="button">
                        <span class="fas fa-external-link-alt" data-fa-transform="shrink-3 down-2"></span>
                        <span class="d-none d-sm-inline-block ms-1">Export</span>
                    </button>
                </div>

            </div>
        </div>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive scrollbar">
            <table class="table table-sm table-striped fs-10 mb-0 overflow-hidden">
                <thead class="bg-200">
                    <tr>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap">STT</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap" data-sort="name">Name</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap" data-sort="email">Email</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap" data-sort="phone">Phone</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap ps-5" data-sort="address"
                            style="min-width: 200px;">Billing Address</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap" data-sort="joined">Joined</th>
                        <th class="text-900 sort pe-1 align-middle white-space-nowrap" data-sort="status">Status</th>

                    </tr>
                </thead>
                <tbody class="list" id="table-customers-body">
                    @foreach ($users as $user)
                    <tr class="btn-reveal-trigger">
                        <td class="align-middle py-2" style="width: 28px;">
                            {{ $loop->iteration + ($users->currentPage() - 1) * $users->perPage() }}
                        </td>
                        <td class="name align-middle white-space-nowrap py-2">
                            <a href="{{ route('admin.users.show', $user->id) }}">
                                <div class="d-flex d-flex align-items-center">
                                    <div class="avatar avatar-xl me-2">
                                        <img class="rounded-circle" src="../../assets/img/team/2.jpg" alt="" />
                                    </div>
                                    <div class="flex-1">
                                        <h5 class="mb-0 fs-10">{{ $user->name }}</h5>
                                    </div>
                                </div>
                            </a>
                        </td>
                        <td class="email align-middle py-2"><a href="mailto:antony@example.com">{{ $user->email }}</a>
                        </td>
                        <td class="phone align-middle white-space-nowrap py-2">
                            @if($user->address === null)
                            <span class="badge bg-warning text-white">Chưa cập nhật số điện thoại</span>
                            @else
                            <a href="tel:9013243127">{{ $user->phone }}</a>
                            @endif
                        </td>
                        <td class="address align-middle white-space-nowrap ps-5 py-2">
                            @if($user->address === null)
                            <span class="badge bg-warning text-white">Chưa cập nhật thông tin địa chỉ</span>
                            @else
                            {{ Str::limit($user->address, 30) }}
                            @endif
                        </td>
                        <td class="joined align-middle py-2">
                            {{ optional($user->created_at)->format('d/m/Y') }}
                        </td>
                        <td class="status align-middle white-space-nowrap py-2">
                            @if ($user->status == 0)
                            <span class="badge bg-success">Đang hoạt động</span>
                            @elseif ($user->status == 1)
                            <span class="badge bg-warning text-dark">Dừng hoạt động</span>
                            @elseif ($user->status == 2)
                            <span class="badge bg-danger">Đã khóa tài khoản</span>
                            @endif
                        </td>

                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
    <div class="d-flex justify-content-center">
        {!! $users->links('pagination::bootstrap-5') !!}
    </div>
</div>

@endsection