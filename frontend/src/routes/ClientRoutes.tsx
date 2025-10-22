import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';

import Home from '../layouts/client/Home';


// 👉 Import thêm các trang client khác nếu có

const ClientRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />

      </Route>
    </Routes>
  );
};

export default ClientRoutes;
