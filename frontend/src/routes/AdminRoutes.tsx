import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard'; 

import CategoryList from '../pages/admin/category/CategoryList';
import CategoryCreate from '../pages/admin/category/CategoryCreate';
import CategoryTrash  from '../pages/admin/category/CategoryTrash';

import AttributeList from '../pages/admin/attributes/AttributeList';
import AttributeCreate from '../pages/admin/attributes/AttributeCreate';
import AttributeTrash from '../pages/admin/attributes/AttributeTrash';

import UserList from '../pages/admin/users/UserList';
import UserDetail from '../pages/admin/users/UserDetail';
import UserCreate from '../pages/admin/users/UserCreate'; 

import ProductList from '../pages/admin/products/ProductList';


const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* ✅ Quản lý user */}
        <Route path="users" element={<UserList />} />
        <Route path="users/create" element={<UserCreate />} /> {/* ✅ tạo mới */}
        <Route path="users/:id" element={<UserDetail />} />    {/* ✅ xem/sửa */}

        {/* ✅ Quản lý danh mục */}
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/trash" element={<CategoryTrash  />} />

        {/* ✅ Quản lý thuộc tính */}
        <Route path="attributes" element={<AttributeList />} />
        <Route path="attributes/create" element={<AttributeCreate />} /> 
        <Route path="attributes/trash" element={<AttributeTrash />} />   

        <Route path="products" element={<ProductList />} />           

      </Route>
    </Routes>
  );
};

export default AdminRoutes;
