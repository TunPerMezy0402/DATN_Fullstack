// src/layouts/AdminLayout.tsx
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
    <div id="page-top" className="admin-layout">
      <div id="wrapper">
        {/* Sidebar cố định bên trái */}
        <Sidebar isToggled={sidebarToggled} onToggle={toggleSidebar} />
        
        {/* Content wrapper bên phải */}
        <div 
          id="content-wrapper" 
          className={`content-wrapper ${sidebarToggled ? 'sidebar-toggled' : ''}`}
        >
          {/* Header */}
          <Header onToggleSidebar={toggleSidebar} />
          
          {/* Main Content */}
          <main className="main-content">
            <div className="container-fluid">
              <Outlet />
            </div>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
      
      <ScrollToTop />
      <LogoutModal />
    </div>
  );
};

export default AdminLayout;