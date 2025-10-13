import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard'; 
import userApi from "../api/userApi";

// 👉 Thêm các trang quản lý user
import UserList from '../pages/admin/users/UserList';
import UserDetail from '../pages/admin/users/UserDetail';
import UserCreate from '../pages/admin/users/UserCreate';


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
        <Route path="users" element={<UserList />} />                 
        <Route path="users/:id" element={<UserDetail />} />   
        <Route path="users/create" element={<UserCreate  />} />              
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
