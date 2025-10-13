import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard'; 
import CategoryList from '../pages/admin/category/CategoryList';
import CategoryCreate from '../pages/admin/category/CategoryCreate';
import CategoryDetail from '../pages/admin/category/CategoryDetail';
import AttributeList from '../pages/admin/attributes/AttributeList';
import AttributeCreate from '../pages/admin/attributes/AttributeCreate';
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
        <Route path="users" element={<UserList />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="users/:id/edit" element={<UserEdit />} />

        {/* ✅ Quản lý danh mục */}
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/:id" element={<CategoryDetail />} />

        {/* ✅ Quản lý thuộc tính */}
        <Route path="attributes" element={<AttributeList />} />
        <Route path="attributes/create" element={<AttributeCreate />} />

      </Route>
    </Routes>
  );
};

export default AdminRoutes;
