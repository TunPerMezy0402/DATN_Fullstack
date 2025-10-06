import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard'; 

// 👉 Thêm các trang quản lý user
import UserList from '../pages/admin/users/UserList';
import UserEdit from '../pages/admin/users/UserEdit';
import UserDetail from '../pages/admin/users/UserDetail';

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Layout tổng cho admin */}
      <Route path="/" element={<AdminLayout />}>
        {/* Redirect mặc định sang Dashboard */}
        <Route index element={<Navigate to="dashboard" />} />

        {/* Trang tổng quan */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Quản lý user */}
        <Route path="users" element={<UserList />} />                    {/* Danh sách user */}
        <Route path="users/:id" element={<UserDetail />} />              {/* Xem chi tiết user */}
        <Route path="users/:id/edit" element={<UserEdit />} />           {/* Sửa user */}
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
