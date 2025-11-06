import React from "react";
import { NavLink } from "react-router-dom";
import "./NewsSidebar.css";

const NewsSidebar: React.FC = () => {
  const categories = [
    { name: "Top 10 đôi giày thể thao đáng mua năm 2025", path: "/news/trends" },
    { name: "Cách bảo quản giày thể thao đúng cách", path: "/news/tips" },
    { name: "Đánh giá & review sản phẩm", path: "/news/review" },
    { name: "Khuyến mãi & sự kiện", path: "/news/promotion" },
    { name: "Xu hướng giày sneaker 2025", path: "/news/story" },
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
