import React from "react";
import { NavLink } from "react-router-dom";
import "./NewsSidebar.css";

const NewsSidebar: React.FC = () => {
  const categories = [
    { name: "Xu hướng giày mới nhất", path: "/news/trends" },
    { name: "Mẹo bảo quản & chăm sóc giày", path: "/news/tips" },
    { name: "Đánh giá & review sản phẩm", path: "/news/review" },
    { name: "Khuyến mãi & sự kiện", path: "/news/promotion" },
    { name: "Câu chuyện thương hiệu & phong cách sống", path: "/news/story" },
  ];

  return (
    <aside className="news-sidebar">
      <h3 className="sidebar-title">DANH MỤC TIN TỨC</h3>
      <ul className="sidebar-list">
        {categories.map((cat, index) => (
          <li key={index}>
            <NavLink to={cat.path} className="sidebar-link">
              {cat.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default NewsSidebar;
