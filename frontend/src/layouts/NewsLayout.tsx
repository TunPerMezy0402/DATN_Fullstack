import React from "react";
import NewsSidebar from "../components/News/NewsSidebar";
import { Outlet } from "react-router-dom"; // nếu bạn dùng nested routes

const NewsLayout: React.FC = () => {
  return (
    <div className="news-layout">
      <NewsSidebar />
      <div className="news-content">
        <Outlet /> {/* Nơi hiển thị các trang: trends, tips, review... */}
      </div>
    </div>
  );
};

export default NewsLayout;
