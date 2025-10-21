// src/layouts/partials/Header.tsx
import '../../../../assets/admin/css/Header.css';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <nav className="admin-header-topbar navbar navbar-expand navbar-light bg-white mb-4 static-top shadow">
      {/* Sidebar Toggle (Topbar) */}
      <button
        id="adminSidebarToggleTop"
        className="admin-header-sidebar-toggle btn btn-link d-md-none rounded-circle me-3"
        onClick={onToggleSidebar}
      >
        <i className="fa fa-bars"></i>
      </button>

      {/* Topbar Search */}
      <form className="admin-header-search-form d-none d-sm-inline-block me-auto ms-md-3 my-2 my-md-0">
        <div className="admin-header-search-group">
          <input
            type="text"
            className="admin-header-search-input form-control bg-light border-0"
            placeholder="Tìm kiếm..."
            aria-label="Search"
            aria-describedby="basic-addon2"
          />
          <button className="admin-header-search-btn btn btn-primary" type="button">
            <i className="fas fa-search fa-sm">Search</i>
          </button>
        </div>
      </form>

      {/* Topbar Navbar */}
      <ul className="admin-header-nav navbar-nav ms-auto">
        {/* Nav Item - Search Dropdown (Visible Only XS) */}
        <li className="admin-header-nav-item nav-item dropdown no-arrow d-sm-none">
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="adminSearchDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i className="fas fa-search fa-fw"></i>
          </a>
          <div
            className="admin-header-dropdown dropdown-menu dropdown-menu-end p-3 shadow"
            aria-labelledby="adminSearchDropdown"
          >
            <form className="admin-header-search-form-mobile w-100">
              <div className="admin-header-search-group">
                <input
                  type="text"
                  className="admin-header-search-input form-control bg-light border-0"
                  placeholder="Tìm kiếm..."
                  aria-label="Search"
                  aria-describedby="basic-addon2"
                />
                <button className="admin-header-search-btn btn btn-primary" type="button">
                  <i className="fas fa-search fa-sm"></i>
                </button>
              </div>
            </form>
          </div>
        </li>

        {/* Nav Item - Alerts */}
        <li className="admin-header-nav-item nav-item dropdown no-arrow mx-1">
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="adminAlertsDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i className="fas fa-bell fa-fw"></i>
            <span className="admin-header-badge badge bg-danger">3+</span>
          </a>
          <div
            className="admin-header-dropdown dropdown-menu dropdown-menu-end shadow"
            aria-labelledby="adminAlertsDropdown"
          >
            <h6 className="admin-header-dropdown-title dropdown-header">Thông báo</h6>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="me-3">
                <div className="admin-header-icon-circle bg-primary">
                  <i className="fas fa-file-alt text-white"></i>
                </div>
              </div>
              <div>
                <div className="admin-header-text-small text-gray-500">12/12/2024</div>
                <span className="fw-bold">Báo cáo mới đã được tạo</span>
              </div>
            </a>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="me-3">
                <div className="admin-header-icon-circle bg-success">
                  <i className="fas fa-donate text-white"></i>
                </div>
              </div>
              <div>
                <div className="admin-header-text-small text-gray-500">12/07/2024</div>
                <span>Đơn hàng mới: $290.29</span>
              </div>
            </a>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="me-3">
                <div className="admin-header-icon-circle bg-warning">
                  <i className="fas fa-exclamation-triangle text-white"></i>
                </div>
              </div>
              <div>
                <div className="admin-header-text-small text-gray-500">12/02/2024</div>
                <span>Cảnh báo: Tài khoản cần xác minh</span>
              </div>
            </a>
            <a className="admin-header-dropdown-link dropdown-item text-center text-gray-500" href="#">
              Xem tất cả thông báo
            </a>
          </div>
        </li>

        {/* Nav Item - Messages */}
        <li className="admin-header-nav-item nav-item dropdown no-arrow mx-1">
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="adminMessagesDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i className="fas fa-envelope fa-fw"></i>
            <span className="admin-header-badge badge bg-danger">7</span>
          </a>
          <div
            className="admin-header-dropdown dropdown-menu dropdown-menu-end shadow"
            aria-labelledby="adminMessagesDropdown"
          >
            <h6 className="admin-header-dropdown-title dropdown-header">Tin nhắn</h6>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="admin-header-user-image me-3">
                <img
                  className="rounded-circle"
                  src="https://i.pravatar.cc/60?img=1"
                  alt="User"
                />
                <div className="admin-header-status-indicator bg-success"></div>
              </div>
              <div className="fw-bold">
                <div className="admin-header-text-truncate">
                  Xin chào! Có vấn đề gì cần hỗ trợ không?
                </div>
                <div className="admin-header-text-small text-gray-500">Emily Fowler · 58 phút</div>
              </div>
            </a>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="admin-header-user-image me-3">
                <img
                  className="rounded-circle"
                  src="https://i.pravatar.cc/60?img=2"
                  alt="User"
                />
                <div className="admin-header-status-indicator bg-warning"></div>
              </div>
              <div>
                <div className="admin-header-text-truncate">
                  Tôi có câu hỏi về sản phẩm mới...
                </div>
                <div className="admin-header-text-small text-gray-500">Jae Chun · 1 giờ</div>
              </div>
            </a>
            <a className="admin-header-dropdown-item dropdown-item d-flex align-items-center" href="#">
              <div className="admin-header-user-image me-3">
                <img
                  className="rounded-circle"
                  src="https://i.pravatar.cc/60?img=3"
                  alt="User"
                />
                <div className="admin-header-status-indicator"></div>
              </div>
              <div>
                <div className="admin-header-text-truncate">
                  Bạn đã nhận được đơn hàng chưa?
                </div>
                <div className="admin-header-text-small text-gray-500">Morgan Alvarez · 2 giờ</div>
              </div>
            </a>
            <a className="admin-header-dropdown-link dropdown-item text-center text-gray-500" href="#">
              Xem tất cả tin nhắn
            </a>
          </div>
        </li>

        <div className="admin-header-divider d-none d-sm-block"></div>

        {/* Nav Item - User Information */}
        <li className="admin-header-nav-item nav-item dropdown no-arrow">
          <a
            className="nav-link dropdown-toggle"
            href="#"
            id="adminUserDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <span className="admin-header-username me-2 d-none d-lg-inline text-gray-600">
              Admin User
            </span>
            <img
              className="admin-header-profile-img rounded-circle"
              src="https://i.pravatar.cc/60?img=10"
              alt="Profile"
            />
          </a>
          <div
            className="admin-header-dropdown dropdown-menu dropdown-menu-end shadow"
            aria-labelledby="adminUserDropdown"
          >
            <a className="admin-header-dropdown-item dropdown-item" href="#">
              <i className="fas fa-user fa-sm fa-fw me-2 text-gray-400"></i>
              Tài khoản
            </a>
            <a className="admin-header-dropdown-item dropdown-item" href="#">
              <i className="fas fa-cogs fa-sm fa-fw me-2 text-gray-400"></i>
              Cài đặt
            </a>
            <a className="admin-header-dropdown-item dropdown-item" href="#">
              <i className="fas fa-list fa-sm fa-fw me-2 text-gray-400"></i>
              Nhật ký hoạt động
            </a>
            <div className="dropdown-divider"></div>
            <a
              className="admin-header-dropdown-item dropdown-item"
              href="#"
              data-bs-toggle="modal"
              data-bs-target="#logoutModal"
            >
              <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>
              Đăng xuất
            </a>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default Header;