// src/layouts/partials/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import '../../../../assets/admin/css/Sidebar.css';

interface SidebarProps {
  isToggled: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  items: { label: string; path: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({ isToggled, onToggle }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const handleMenuToggle = (menu: string) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const menuGroups: MenuItem[] = [
    {
      id: 'categories',
      title: 'Danh mục',
      icon: 'fa-folder',
      items: [
        { label: 'Tất cả danh mục', path: '/admin/categories' },
        { label: 'Thêm danh mục', path: '/admin/categories/create' },
        { label: 'Danh mục lưu trữ', path: '/admin/categories/trash' },
      ],
    },
    {
      id: 'attributes',
      title: 'Thuộc tính',
      icon: 'fa-list',
      items: [
        { label: 'Tất cả thuộc tính', path: '/admin/attributes' },
        { label: 'Thêm thuộc tính', path: '/admin/attributes/create' },
        { label: 'Thuộc tính lưu trữ', path: '/admin/attributes/trash' },
      ],
    },
    {
      id: 'products',
      title: 'Sản phẩm',
      icon: 'fa-box',
      items: [
        { label: 'Tất cả sản phẩm', path: '/admin/products' },
        { label: 'Thêm sản phẩm', path: '/admin/products/add' },
        { label: 'Danh mục', path: '/admin/categories' },
      ],
    },
    {
      id: 'pages',
      title: 'Trang',
      icon: 'fa-file-alt',
      items: [
        { label: 'Tất cả trang', path: '/admin/pages' },
        { label: 'Thêm trang mới', path: '/admin/pages/add' },
      ],
    },
  ];

  return (
    <>
      <aside
        className={`sidebar ${isToggled ? 'sidebar--collapsed' : ''}`}
        id="accordionSidebar"
      >
        {/* Sidebar Brand */}
        <div className="sidebar__brand">
          <NavLink to="/admin" className="sidebar__brand-link">
            <div className="sidebar__brand-icon">
              <i className="fas fa-cube"></i>
            </div>
            <span className="sidebar__brand-text">Admin Panel</span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {/* Dashboard */}
          <div className="sidebar__section">
            <NavLink to="/admin/dashboard" className="sidebar__link">
              <i className="sidebar__icon fas fa-tachometer-alt"></i>
              <span className="sidebar__text">Dashboard</span>
            </NavLink>
          </div>

          {/* Management Section */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Quản lý</div>
            
            <NavLink to="/admin/users" className="sidebar__link">
              <i className="sidebar__icon fas fa-users"></i>
              <span className="sidebar__text">Người dùng</span>
            </NavLink>

            {/* Collapsible Menus */}
            {menuGroups.slice(0, 3).map((menu) => (
              <div key={menu.id} className="sidebar__dropdown">
                <button
                  className={`sidebar__link sidebar__link--dropdown ${
                    expandedMenu === menu.id ? 'sidebar__link--active' : ''
                  }`}
                  onClick={() => handleMenuToggle(menu.id)}
                  aria-expanded={expandedMenu === menu.id}
                >
                  <i className={`sidebar__icon fas ${menu.icon}`}></i>
                  <span className="sidebar__text">{menu.title}</span>
                  <i
                    className={`sidebar__arrow fas fa-chevron-down ${
                      expandedMenu === menu.id ? 'sidebar__arrow--rotated' : ''
                    }`}
                  ></i>
                </button>
                <div
                  className={`sidebar__submenu ${
                    expandedMenu === menu.id ? 'sidebar__submenu--open' : ''
                  }`}
                >
                  {menu.items.map((item, idx) => (
                    <NavLink
                      key={idx}
                      to={item.path}
                      className="sidebar__sublink"
                    >
                      <span className="sidebar__sublink-dot"></span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            <NavLink to="/admin/orders" className="sidebar__link">
              <i className="sidebar__icon fas fa-shopping-cart"></i>
              <span className="sidebar__text">Đơn hàng</span>
            </NavLink>

            <NavLink to="/admin/customers" className="sidebar__link">
              <i className="sidebar__icon fas fa-user-friends"></i>
              <span className="sidebar__text">Khách hàng</span>
            </NavLink>
          </div>

          {/* Content Section */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Nội dung</div>
            
            {/* Pages Dropdown */}
            <div className="sidebar__dropdown">
              <button
                className={`sidebar__link sidebar__link--dropdown ${
                  expandedMenu === 'pages' ? 'sidebar__link--active' : ''
                }`}
                onClick={() => handleMenuToggle('pages')}
                aria-expanded={expandedMenu === 'pages'}
              >
                <i className="sidebar__icon fas fa-file-alt"></i>
                <span className="sidebar__text">Trang</span>
                <i
                  className={`sidebar__arrow fas fa-chevron-down ${
                    expandedMenu === 'pages' ? 'sidebar__arrow--rotated' : ''
                  }`}
                ></i>
              </button>
              <div
                className={`sidebar__submenu ${
                  expandedMenu === 'pages' ? 'sidebar__submenu--open' : ''
                }`}
              >
                {menuGroups[3].items.map((item, idx) => (
                  <NavLink
                    key={idx}
                    to={item.path}
                    className="sidebar__sublink"
                  >
                    <span className="sidebar__sublink-dot"></span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <NavLink to="/admin/blog" className="sidebar__link">
              <i className="sidebar__icon fas fa-blog"></i>
              <span className="sidebar__text">Blog</span>
            </NavLink>
          </div>

          {/* Reports Section */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Báo cáo</div>
            
            <NavLink to="/admin/charts" className="sidebar__link">
              <i className="sidebar__icon fas fa-chart-area"></i>
              <span className="sidebar__text">Biểu đồ</span>
            </NavLink>

            <NavLink to="/admin/tables" className="sidebar__link">
              <i className="sidebar__icon fas fa-table"></i>
              <span className="sidebar__text">Bảng dữ liệu</span>
            </NavLink>
          </div>

          {/* System Section */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Hệ thống</div>
            
            <NavLink to="/admin/settings" className="sidebar__link">
              <i className="sidebar__icon fas fa-cog"></i>
              <span className="sidebar__text">Cài đặt</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isToggled && (
        <div className="sidebar__overlay" onClick={onToggle} />
      )}
    </>
  );
};

export default Sidebar;