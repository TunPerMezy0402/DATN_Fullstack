import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";


const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Nội dung chính */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
