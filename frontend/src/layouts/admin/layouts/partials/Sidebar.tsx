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
      id: "banners",
      title: "Banner",
      icon: "fa-box",
      items: [
        { label: "Tất cả banner", path: "/admin/banners" },
        { label: "Thêm banner", path: "/admin/banners/add" },
      ],
    },
    {
      id: "orders",
      title: "Đơn hàng",
      icon: "fa-shopping-cart",
      items: [
        { label: "Tất cả đơn hàng", path: "/admin/orders" },
      ],
    },
    {
      id: "coupons",
      title: "Mã giảm giá",
      icon: "fa-tag",
      items: [
        { label: "Tất cả mã giảm giá", path: "/admin/coupons" },
        { label: "Thêm mã giảm giá", path: "/admin/coupons/create" },
        { label: "Mã lưu trữ", path: "/admin/coupons/trash" },
      ],
    },
    {
      id: "comments",
      title: "Quản lý bình luận",
      icon: "fa-comments",
      items: [
        { label: "Tất cả bình luận", path: "/admin/comments" },
        { label: "Bình luận chờ duyệt", path: "/admin/comments/pending" },
      ],
    },
    {
      id: "support",
      title: "Hỗ Trợ Khách Hàng",
      icon: "fa-headset",
      items: [
        { label: "Tất cả ticket", path: "/admin/support-tickets" },
        { label: "Ticket mở", path: "/admin/support-tickets?status=open" },
        { label: "Đang xử lý", path: "/admin/support-tickets?status=in_progress" },
        { label: "Đã đóng", path: "/admin/support-tickets?status=closed" },
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
              onClick={onToggle}
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