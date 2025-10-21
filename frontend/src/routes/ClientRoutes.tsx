import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';

import Home from '../layouts/client/Home';
import Banner from '../layouts/client/component/Banner';
import Menu from '../layouts/client/component/Menu';
import OutstandingProducts from '../layouts/client/component/OutstandingProducts';
import ServicesRow from '../layouts/client/component//ServicesRow';
import Trending from '../layouts/client/component/Trending';

// 👉 Import thêm các trang client khác nếu có

const ClientRoutes = () => {
  return (
    <Routes>
      {/* Bọc toàn bộ route client bằng layout MainLayout */}
      <Route path="/" element={<MainLayout />}>
        {/* Trang chủ */}
        <Route index element={<Home />} />

        {/* Các route khác */}
        <Route path="banner" element={<Banner />} />
        <Route path="menu" element={<Menu />} />
        <Route path="outstandingproducts" element={<OutstandingProducts />} />
        <Route path="servicesrow" element={<ServicesRow />} />
        <Route path="trending" element={<Trending />} />

        {/* <Route path="contact" element={<Contact />} /> */}
      </Route>
    </Routes>
  );
};

export default ClientRoutes;
