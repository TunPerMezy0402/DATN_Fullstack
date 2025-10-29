import React from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/Layout/MainLayout";

// Các trang client
import Home from "../layouts/client/Home";
import Banner from "../layouts/client/component/Banner";
import Menu from "../layouts/client/component/Menu";
import OutstandingProducts from "../layouts/client/component/OutstandingProducts";
import ServicesRow from "../layouts/client/component/ServicesRow";
import Trending from "../layouts/client/component/Trending";
import ProductsPage from "../layouts/client/component/ProductsPage";
import ProductDetail from "../layouts/client/component/ProductDetail";

// ✅ Import Sidebar tin tức
import NewsSidebar from "../components/News/NewsSidebar";

const ClientRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Trang chủ */}
        <Route index element={<Home />} />

        {/* Các trang khác */}
        <Route path="banner" element={<Banner />} />
        <Route path="menu" element={<Menu />} />
        <Route path="outstanding-products" element={<OutstandingProducts />} />
        <Route path="services-row" element={<ServicesRow />} />
        <Route path="trending" element={<Trending />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetail />} />

        {/* ✅ Trang tin tức chỉ hiển thị sidebar */}
        <Route path="news" element={<NewsSidebar />} />
      </Route>
    </Routes>
  );
};

export default ClientRoutes;
