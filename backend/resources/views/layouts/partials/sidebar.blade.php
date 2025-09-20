<nav class="navbar navbar-light navbar-vertical navbar-expand-xl" style="display: none;">
    <script>
        var navbarStyle = localStorage.getItem("navbarStyle");
        if (navbarStyle && navbarStyle !== 'transparent') {
            document.querySelector('.navbar-vertical').classList.add(`navbar-${navbarStyle}`);
        }
    </script>

    <!-- Logo + Toggle -->
    <div class="d-flex align-items-center">
        <div class="toggle-icon-wrapper">
            <button class="btn navbar-toggler-humburger-icon navbar-vertical-toggle" data-bs-toggle="tooltip"
                data-bs-placement="left" title="Toggle Navigation">
                <span class="navbar-toggle-icon">
                    <span class="toggle-line"></span>
                </span>
            </button>
        </div>
        <a class="navbar-brand" href="{{ route('admin.index') }}">
            <div class="d-flex align-items-center py-3">
                <img class="me-2" src="{{ asset('assets/img/logos/logoheader.png') }}" alt="" width="60" />
                <span class="font-sans-serif text-white">MiNiBo</span>
            </div>
        </a>
    </div>

    <!-- Menu -->
    <div class="collapse navbar-collapse" id="navbarVerticalCollapse">
        <div class="navbar-vertical-content scrollbar">
            <ul class="navbar-nav flex-column mb-3" id="navbarVerticalNav">

                <!-- Label -->
                <li class="nav-item">
                    <div class="row navbar-vertical-label-wrapper mt-3 mb-2">
                        <div class="col-auto navbar-vertical-label">App</div>
                        <div class="col ps-0">
                            <hr class="mb-0 navbar-vertical-divider" />
                        </div>
                    </div>
                </li>

                <!-- Quản lý người dùng -->
                <li class="nav-item">
                    <a class="nav-link" href="{{ route('admin.users.index') }}">
                        <div class="d-flex align-items-center">
                            <span class="nav-link-icon"><i class="fas fa-users"></i></span>
                            <span class="nav-link-text ps-1">Quản Lý Người Dùng</span>
                        </div>
                    </a>
                </li>


                <!-- Quản lý rạp -->
                <li class="nav-item">
                    <a class="nav-link" href="{{-- {{ route('admin.cinemas.index') }} --}}">
                        <div class="d-flex align-items-center">
                            <span class="nav-link-icon"><i class="fas fa-building"></i></span>
                            <span class="nav-link-text ps-1">Quản Lý Rạp</span>
                        </div>
                    </a>
                </li>

                <!-- Biến thể phim -->
                <li class="nav-item">
                    <a class="nav-link dropdown-indicator" href="#onemies" role="button" data-bs-toggle="collapse"
                        aria-expanded="false" aria-controls="onemies">
                        <div class="d-flex align-items-center">
                            <span class="nav-link-icon"><i class="fas fa-tags"></i></span>
                            <span class="nav-link-text ps-1">Quản Lý Biến Thể</span>
                        </div>
                    </a>
                    <ul class="nav collapse" id="onemies">
                        <li class="nav-item">
                            <a class="nav-link" href="{{-- {{ route('admin.countries.index') }} --}}">
                                <div class="d-flex align-items-center">
                                    <span class="nav-link-text ps-1">Quốc Gia</span>
                                </div>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="{{-- {{ route('admin.actors.index') }} --}}">
                                <div class="d-flex align-items-center">
                                    <span class="nav-link-text ps-1">Diễn Viên</span>
                                </div>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="{{-- {{ route('admin.genres.index') }} --}}">
                                <div class="d-flex align-items-center">
                                    <span class="nav-link-text ps-1">Thể Loại</span>
                                </div>
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="{{-- {{ route('admin.directors.index') }} --}}">
                                <div class="d-flex align-items-center">
                                    <span class="nav-link-text ps-1">Đạo Diễn</span>
                                </div>
                            </a>
                        </li>
                    </ul>
                </li>

            </ul>
        </div>
    </div>
</nav>

<nav class="navbar navbar-light navbar-glass navbar-top navbar-expand-lg" style="display: none;">
    <button class="btn navbar-toggler-humburger-icon navbar-toggler me-1 me-sm-3" type="button"
        data-bs-toggle="collapse" data-bs-target="#navbarStandard" aria-controls="navbarStandard" aria-expanded="false"
        aria-label="Toggle Navigation">
        <span class="navbar-toggle-icon">
            <span class="toggle-line">
            </span>
        </span>
    </button>
    <a class="navbar-brand me-1 me-sm-3" href="index.html">
        <div class="d-flex align-items-center">
            <img class="me-2" src="{{asset('assets/img/icons/spot-illustrations/falcon.png') }}" alt="" width="40" />
            <span class="font-sans-serif text-primary">falcon</span>
        </div>
    </a>
    <div class="collapse navbar-collapse scrollbar" id="navbarStandard">
        <ul class="navbar-nav" data-top-nav-dropdowns="data-top-nav-dropdowns">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown"
                    aria-haspopup="true" aria-expanded="false" id="dashboards">Dashboard</a>
                <div class="dropdown-menu dropdown-caret dropdown-menu-card border-0 mt-0" aria-labelledby="dashboards">
                    <div class="bg-white dark__bg-1000 rounded-3 py-2">
                        <a class="dropdown-item link-600 fw-medium" href="index.html">Default</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/analytics.html">Analytics</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/crm.html">CRM</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/e-commerce.html">E
                            commerce</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/lms.html">LMS
                            <span class="badge rounded-pill ms-2 badge-subtle-success">New</span>
                        </a>
                        <a class="dropdown-item link-600 fw-medium"
                            href="dashboard/project-management.html">Management</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/saas.html">SaaS</a>
                        <a class="dropdown-item link-600 fw-medium" href="dashboard/support-desk.html">Support desk
                            <span class="badge rounded-pill ms-2 badge-subtle-success">New</span>
                        </a>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</nav>