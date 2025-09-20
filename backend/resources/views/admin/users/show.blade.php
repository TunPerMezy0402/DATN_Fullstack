@extends('admin.layouts.AdminLayout')

@section('content')
<div class="container mt-4">
    <a href="{{ route('admin.users.index') }}" class="btn btn-danger btn-sm">Back</a>
    @if(session('success'))
        <div class="alert alert-success mt-2">
            {{ session('success') }}
        </div>
    @endif

    <div class="card mb-3 mt-3">
        <div class="card-header">
            <div class="row">
                <div class="col">
                    <h5 class="mb-2">{{ $user->name }} (
                        <a href="mailto:tony@gmail.com">{{ $user->email }}</a>)
                    </h5>
                </div>
                <div class="col-auto d-none d-sm-block">
                    <h6 class="text-uppercase text-700 fs-7">
                        @if ( $user->role === 'user')
                        <span class="badge bg-warning">{{ $user->role }}</span>
                        @elseif ( $user->role === 'vendor' )
                        <span class="badge bg-info">{{ $user->role }}</span>
                        @else
                        <span class="badge bg-primary">{{ $user->role }}</span>
                        @endif

                        @if ( $user->status === "0")
                        <span class="fas fa-user ms-3 text-success fs-6"></span>
                        @else
                        <span class="fas fa-user ms-3 text-danger fs-6"></span>
                        @endif
                    </h6>
                </div>
            </div>
        </div>
        <div class="card-body border-top">
            <div class="d-flex">
                <!-- Cột 1 -->
                <div class="w-50 d-flex">
                    <span class="fas fa-hourglass-half text-success me-2" data-fa-transform="down-5"></span>
                    <div class="flex-1">
                        <p class="mb-0">Customer was created :</p>
                        <p class="m-2 fs-10 mb-0 text-600">{{ optional($user->created_at)->format('d/m/Y H:i:s') }}</p>
                    </div>
                </div>
                <!-- Cột 2 -->
                <div class="w-50 d-flex justify-content-end">
                    <form action="{{ route('admin.users.destroy', $user->id) }}" method="POST" style="display: inline;">
                        @csrf
                        @method('DELETE')
                        <!-- From Uiverse.io by sihamjardi -->
                        <button class="button-custommer" type="submit"
                            onclick="return confirm('Bạn có chắc chắn muốn xóa người dùng này không?')">
                            <span class="button-custommer__text">Delete</span>
                            <span class="button-custommer__icon"><svg class="svg" height="512" viewBox="0 0 512 512"
                                    width="512" xmlns="http://www.w3.org/2000/svg">
                                    <title></title>
                                    <path
                                        d="M112,112l20,320c.95,18.49,14.4,32,32,32H348c17.67,0,30.87-13.51,32-32l20-320"
                                        style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px">
                                    </path>
                                    <line
                                        style="stroke:#fff;stroke-linecap:round;stroke-miterlimit:10;stroke-width:32px"
                                        x1="80" x2="432" y1="112" y2="112"></line>
                                    <path d="M192,112V72h0a23.93,23.93,0,0,1,24-24h80a23.93,23.93,0,0,1,24,24h0v40"
                                        style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px">
                                    </path>
                                    <line
                                        style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px"
                                        x1="256" x2="256" y1="176" y2="400"></line>
                                    <line
                                        style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px"
                                        x1="184" x2="192" y1="176" y2="400"></line>
                                    <line
                                        style="fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round;stroke-width:32px"
                                        x1="328" x2="320" y1="176" y2="400"></line>
                                </svg></span>
                        </button>
                    </form>
                </div>
            </div>
        </div>

    </div>
    <div class="card mb-3">
        <div class="card-header">
            <div class="row align-items-center">
                <div class="col">
                    <h5 class="mb-0">Details</h5>
                </div>
                <div class="col-auto">
                    <a href="#!">
                        <!-- From Uiverse.io by aaronross1 -->

                    </a>
                </div>
            </div>
        </div>
        <form class="card-body bg-body-tertiary border-top" action="{{ route('admin.users.update', $user->id) }}"
            method="POST">
            @csrf
            @method('PUT')
            <div class="row">
                <div class="col-lg col-xxl-5">
                    <h6 class="fw-semi-bold ls mb-3 text-uppercase">Account Information</h6>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">ID</p>
                        </div>
                        <div class="col"> {{ $user->id }} </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Created</p>
                        </div>
                        <div class="col">
                            {{ optional($user->created_at)->format('H:i:s d/m/Y') }}
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Phone</p>
                        </div>
                        <div class="col">
                            <p class=" mb-1">{{ $user->phone }}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Email</p>
                        </div>
                        <div class="col">
                            <a href="">{{ $user->email }}</a>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-0">VAT number</p>
                        </div>
                        <div class="mb-3 col">
                            <select name="status" id="status" class="form-select">
                                <option value="0" {{ old('status', $user->status) == 0 ? 'selected' : '' }}>Mở tài khoản
                                </option>
                                <option value="1" {{ old('status', $user->status) == 1 ? 'selected' : '' }}>Khóa tài
                                    khoản</option>
                            </select>
                        </div>

                    </div>
                </div>
                <div class="col-lg col-xxl-5 mt-4 mt-lg-0 offset-xxl-1">
                    <h6 class="fw-semi-bold ls mb-3 text-uppercase">Billing Information</h6>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Send email to</p>
                        </div>
                        <div class="col">
                            <a href="mailto:tony@gmail.com"> {{ $user->email }} </a>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Address</p>
                        </div>
                        <div class="col">
                            <p class="mb-1"> {{ $user->address }}
                            </p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Phone number</p>
                        </div>
                        <div class="col">
                            <a href="tel:+12025550110">+1-202-555-0110</a>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-1">Phone number</p>
                        </div>
                        <div class="col">
                            <a href="tel:+12025550110">+1-202-555-0110</a>
                        </div>
                    </div>
                    {{-- <div class="row">
                        <div class="col-5 col-sm-4">
                            <p class="fw-semi-bold mb-0">Invoice prefix</p>
                        </div>
                        <div class="mb-3 col">
                            <select class="form-select @error('role') is-invalid @enderror" id="role" name="role">
                                <option value="user" {{ old('role')=='user' ? 'selected' : '' }}>User</option>
                                <option value="vendor" {{ old('role')=='vendor' ? 'selected' : '' }}>Vendor</option>
                                <option value="admin" {{ old('role')=='admin' ? 'selected' : '' }}>Admin</option>
                            </select>
                        </div>
                    </div> --}}
                </div>
            </div>
            <div class="card-footer border-top text-end">
                <button type="submit" class="btn btn-falcon-default btn-sm">
                    <span class="fas fa-dollar-sign fs-11 me-1"></span>
                    Save
                </button>
                {{-- <a class="btn btn-falcon-default btn-sm ms-2" href="#!">
                    <span class="fas fa-check fs-11 me-1">
                    </span>Save changes
                </a> --}}
            </div>
        </form>
    </div>
    <div class="card">
        <div class="card-header">
            <h5 class="mb-0">Logs</h5>
        </div>
        <div class="card-body border-top p-0">
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-success rounded-pill">200</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoiceitems</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/23 15:29:45</p>
                </div>
            </div>
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-warning rounded-pill">400</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoiceitems</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/19 21:32:12</p>
                </div>
            </div>
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-success rounded-pill">200</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoices/in_1Dnkhadfk</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/26 12:23:43</p>
                </div>
            </div>
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-success rounded-pill">200</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoices/in_1Dnkhadfk</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/12 23:32:12</p>
                </div>
            </div>
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-danger rounded-pill">404</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoices/in_1Dnkhadfk</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/08 02:20:23</p>
                </div>
            </div>
            <div class="row g-0 align-items-center border-bottom py-2 px-3">
                <div class="col-md-auto pe-3">
                    <span class="badge badge-subtle-success rounded-pill">200</span>
                </div>
                <div class="col-md mt-1 mt-md-0"><code>POST /v1/invoices/in_1Dnkhadfk</code>
                </div>
                <div class="col-md-auto">
                    <p class="mb-0">2019/02/01 12:29:34</p>
                </div>
            </div>
        </div>
        <div class="card-footer bg-body-tertiary p-0">
            <a class="btn btn-link d-block w-100" href="#!">View more logs
                <span class="fas fa-chevron-right fs-11 ms-1">
                </span>
            </a>
        </div>
    </div>
</div>

@endsection