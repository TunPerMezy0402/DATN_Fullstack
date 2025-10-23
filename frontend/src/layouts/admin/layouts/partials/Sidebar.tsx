import { NavLink } from "react-router-dom";
import { useState } from "react";
import "../../../../assets/admin/css/Sidebar.css";

interface SidebarProps {
  isToggled: boolean;  // true = đang mở (mobile) / không collapsed (desktop)
  onToggle: () => void;
}

interface SubItem {
  label: string;
  path: string;
}

interface MenuItem {
  id: string;       // unique
  title: string;
  icon: string;     // Font Awesome icon class (vd: "fa-box")
  items: SubItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isToggled, onToggle }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const handleMenuToggle = (menuId: string) => {
    setExpandedMenu((cur) => (cur === menuId ? null : menuId));
  };

  const managementGroups: MenuItem[] = [
    {
      id: "categories",
      title: "Danh mục",
      icon: "fa-folder",
      items: [
        { label: "Tất cả danh mục", path: "/admin/categories" },
        { label: "Thêm danh mục", path: "/admin/categories/create" },
        { label: "Danh mục lưu trữ", path: "/admin/categories/trash" },
      ],
    },
    {
      id: "attributes",
      title: "Thuộc tính",
      icon: "fa-list",
      items: [
        { label: "Tất cả thuộc tính", path: "/admin/attributes" },
        { label: "Thêm thuộc tính", path: "/admin/attributes/create" },
        { label: "Thuộc tính lưu trữ", path: "/admin/attributes/trash" },
      ],
    },
    {
      id: "products",
      title: "Sản phẩm",
      icon: "fa-box",
      items: [
        { label: "Tất cả sản phẩm", path: "/admin/products" },
        { label: "Thêm sản phẩm", path: "/admin/products/create" },
        { label: "Danh sách xóa mềm", path: "/admin/products/trash" },
      ],
    },
    {
      id: "orders",
      title: "Đơn hàng",
      icon: "fa-list",
      items: [
        { label: "Tất cả đơn hàng", path: "admin/orders" },
      ]
    },
  ];

  const contentGroups: MenuItem[] = [
    {
      id: "blog",
      title: "Blog",
      icon: "fa-file-alt",
      items: [
        { label: "Tất cả trang", path: "/admin/blog" },
        { label: "Thêm trang mới", path: "/admin/blog/create" },
      ],
    },
    {
      id: "banner",
      title: "Banner",
      icon: "fa-image",
      items: [
        { label: "Tất cả Banner", path: "/admin/banners" },
        { label: "Thêm banner mới", path: "/admin/banners/create" },
      ],
    },
  ];

  const DropdownGroup = ({ group }: { group: MenuItem }) => {
    const open = expandedMenu === group.id;
    return (
      <div className="sidebar__dropdown" key={group.id}>
        <button
          className={`sidebar__link sidebar__link--dropdown ${open ? "sidebar__link--active" : ""}`}
          onClick={() => handleMenuToggle(group.id)}
          aria-expanded={open}
          aria-controls={`submenu-${group.id}`}
          type="button"
        >
          <i className={`sidebar__icon fas ${group.icon}`} />
          <span className="sidebar__text">{group.title}</span>
          <i className={`sidebar__arrow fas fa-chevron-down ${open ? "sidebar__arrow--rotated" : ""}`} />
        </button>

        <div
          id={`submenu-${group.id}`}
          className={`sidebar__submenu ${open ? "sidebar__submenu--open" : ""}`}
          // để screen reader hiểu có thể mở/đóng
          role="region"
          aria-hidden={!open}
        >
          {group.items.map((item, idx) => (
            <NavLink
              key={`${group.id}-${idx}`}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__sublink ${isActive ? "sidebar__sublink--active" : ""}`
              }
              onClick={onToggle} // đóng sidebar trên mobile
            >
              <span className="sidebar__sublink-dot" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className={`sidebar ${isToggled ? "is-open" : ""}`}>

        {/* Brand */}
        <div className="sidebar__brand">
          <NavLink to="/admin" className="sidebar__brand-link" onClick={onToggle}>
            <div className="sidebar__brand-icon">
              <i className="fas fa-cube" />
            </div>
            <span className="sidebar__brand-text">Admin Panel</span>
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">

          {/* Dashboard */}
          <div className="sidebar__section">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-tachometer-alt" />
              <span className="sidebar__text">Dashboard</span>
            </NavLink>
          </div>

          {/* Quản lý */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Quản lý</div>

            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-users" />
              <span className="sidebar__text">Người dùng</span>
            </NavLink>

            {managementGroups.map((g) => (
              <DropdownGroup key={g.id} group={g} />
            ))}

            <NavLink
              to="/admin/orders"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-shopping-cart" />
              <span className="sidebar__text">Đơn hàng</span>
            </NavLink>

            <NavLink
              to="/admin/customers"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-user-friends" />
              <span className="sidebar__text">Khách hàng</span>
            </NavLink>
          </div>

          {/* Nội dung */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Nội dung</div>
            {contentGroups.map((g) => (
              <DropdownGroup key={g.id} group={g} />
            ))}
          </div>

          {/* Báo cáo */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Báo cáo</div>

            <NavLink
              to="/admin/charts"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-chart-area" />
              <span className="sidebar__text">Biểu đồ</span>
            </NavLink>

            <NavLink
              to="/admin/tables"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-table" />
              <span className="sidebar__text">Bảng dữ liệu</span>
            </NavLink>
          </div>

          {/* Hệ thống */}
          <div className="sidebar__section">
            <div className="sidebar__heading">Hệ thống</div>

            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onToggle}
            >
              <i className="sidebar__icon fas fa-cog" />
              <span className="sidebar__text">Cài đặt</span>
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Overlay cho mobile */}
      <div
        className={`sidebar__overlay ${isToggled ? "is-visible" : ""}`}
        onClick={onToggle}
      />
    </>
  );
};

export default Sidebar;
