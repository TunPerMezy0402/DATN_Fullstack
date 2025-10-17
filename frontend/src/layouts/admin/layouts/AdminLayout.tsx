import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../../../assets/admin/css/AdminLayout.css';

import { Outlet } from "react-router-dom";
import { useState } from "react";
import Header from "./partials/Header";
import Sidebar from "./partials/Sidebar";
import Footer from "./partials/Footer";
import ScrollToTop from "./partials/ScrollToTop";
import LogoutModal from "./partials/LogoutModal";

const AdminLayout: React.FC = () => {
  const [sidebarToggled, setSidebarToggled] = useState(false);

  const toggleSidebar = () => {
    setSidebarToggled(!sidebarToggled);
  };

  return (
    <div id="admin-layout">
      {/* Sidebar cố định bên trái */}
      <Sidebar isToggled={sidebarToggled} onToggle={toggleSidebar} />

      {/* Khu vực bên phải */}
      <div className={`admin-main ${sidebarToggled ? 'sidebar-collapsed' : ''}`}>
        {/* Header cố định trên */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* Nội dung chính cuộn được */}
        <main className="admin-content">
          <Outlet />
        </main>

        {/* Footer cố định dưới (hoặc để tự động nếu muốn) */}
        <Footer />
      </div>

      <ScrollToTop />
      <LogoutModal />
    </div>
  );
};

export default AdminLayout;
