// src/layouts/partials/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import '../../../../assets/admin/css/Sidebar.css'; // CSS tùy chỉnh


interface SidebarProps {
  isToggled: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isToggled, onToggle }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const handleMenuToggle = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  return (
    <>
      <ul
        className={`navbar-nav bg-gradient-primary sidebar sidebar-dark accordion ${isToggled ? 'toggled' : ''
          }`}
        id="accordionSidebar"
      >
        {/* Sidebar - Brand */}
        <a
          className="sidebar-brand d-flex align-items-center justify-content-center"
          href="/admin"
        >
          <div className="sidebar-brand-icon rotate-n-15">
            <i className="fas fa-laugh-wink"></i>
          </div>
          <div className="sidebar-brand-text mx-3">Admin Panel</div>
        </a>

        {/* Divider */}
        <hr className="sidebar-divider my-0" />

        {/* Nav Item - Dashboard */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/dashboard"
          >
            <i className="fas fa-fw fa-tachometer-alt"></i>
            <span>Dashboard</span>
          </NavLink>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider" />

        {/* Heading */}
        <div className="sidebar-heading">Quản lý</div>

        {/* Nav Item - Users */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/users"
          >
            <i className="fas fa-fw fa-users"></i>
            <span>Người dùng</span>
          </NavLink>
        </li>

        {/* Nav Item - Products Collapse Menu */}
        <li className="nav-item">
          <a
            className={`nav-link ${expandedMenu === 'products' ? '' : 'collapsed'}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleMenuToggle('products');
            }}
            data-bs-toggle="collapse"
            data-bs-target="#collapseProducts"
            aria-expanded={expandedMenu === 'products'}
            aria-controls="collapseProducts"
          >
            <i className="fas fa-fw fa-box"></i>
            <span>Sản phẩm</span>
          </a>
          <div
            id="collapseProducts"
            className={`collapse ${expandedMenu === 'products' ? 'show' : ''}`}
            aria-labelledby="headingProducts"
            data-bs-parent="#accordionSidebar"
          >
            <div className="bg-white py-2 collapse-inner rounded">
              <h6 className="collapse-header">Quản lý sản phẩm:</h6>
              <NavLink
                className={({ isActive }) => `collapse-item ${isActive ? 'active' : ''}`}
                to="/admin/products"
              >
                Tất cả sản phẩm
              </NavLink>
              <NavLink
                className={({ isActive }) => `collapse-item ${isActive ? 'active' : ''}`}
                to="/admin/products/add"
              >
                Thêm sản phẩm
              </NavLink>
              <NavLink
                className={({ isActive }) => `collapse-item ${isActive ? 'active' : ''}`}
                to="/admin/categories"
              >
                Danh mục
              </NavLink>
            </div>
          </div>
        </li>

        {/* Nav Item - Orders */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/orders"
          >
            <i className="fas fa-fw fa-shopping-cart"></i>
            <span>Đơn hàng</span>
          </NavLink>
        </li>

        {/* Nav Item - Customers */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/customers"
          >
            <i className="fas fa-fw fa-user-friends"></i>
            <span>Khách hàng</span>
          </NavLink>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider" />

        {/* Heading */}
        <div className="sidebar-heading">Nội dung</div>

        {/* Nav Item - Pages Collapse Menu */}
        <li className="nav-item">
          <a
            className={`nav-link ${expandedMenu === 'pages' ? '' : 'collapsed'}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleMenuToggle('pages');
            }}
            data-bs-toggle="collapse"
            data-bs-target="#collapsePages"
            aria-expanded={expandedMenu === 'pages'}
            aria-controls="collapsePages"
          >
            <i className="fas fa-fw fa-file-alt"></i>
            <span>Trang</span>
          </a>
          <div
            id="collapsePages"
            className={`collapse ${expandedMenu === 'pages' ? 'show' : ''}`}
          >
            <div className="bg-white py-2 collapse-inner rounded">
              <h6 className="collapse-header">Quản lý trang:</h6>
              <NavLink
                className={({ isActive }) => `collapse-item ${isActive ? 'active' : ''}`}
                to="/admin/pages"
              >
                Tất cả trang
              </NavLink>
              <NavLink
                className={({ isActive }) => `collapse-item ${isActive ? 'active' : ''}`}
                to="/admin/pages/add"
              >
                Thêm trang mới
              </NavLink>
            </div>
          </div>
        </li>

        {/* Nav Item - Blog */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/blog"
          >
            <i className="fas fa-fw fa-blog"></i>
            <span>Blog</span>
          </NavLink>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider" />

        {/* Heading */}
        <div className="sidebar-heading">Báo cáo</div>

        {/* Nav Item - Charts */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/charts"
          >
            <i className="fas fa-fw fa-chart-area"></i>
            <span>Biểu đồ</span>
          </NavLink>
        </li>

        {/* Nav Item - Tables */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/tables"
          >
            <i className="fas fa-fw fa-table"></i>
            <span>Bảng dữ liệu</span>
          </NavLink>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider" />

        {/* Heading */}
        <div className="sidebar-heading">Hệ thống</div>

        {/* Nav Item - Settings */}
        <li className="nav-item">
          <NavLink
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            to="/admin/settings"
          >
            <i className="fas fa-fw fa-cog"></i>
            <span>Cài đặt</span>
          </NavLink>
        </li>

        {/* Divider */}
        <hr className="sidebar-divider d-none d-md-block" />

        {/* Sidebar Toggler (Sidebar) */}
      </ul>

      {/* Mobile Overlay */}
      {isToggled && (
        <div
          className="sidebar-overlay d-md-none"
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}
    </>
  );
};

export default Sidebar;