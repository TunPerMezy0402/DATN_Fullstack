import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard';

import CategoryList from '../pages/admin/category/CategoryList';
import CategoryCreate from '../pages/admin/category/CategoryCreate';
import CategoryTrash from '../pages/admin/category/CategoryTrash';
import CategoryEdit from '../pages/admin/category/CategoryEdit';

import AttributeList from '../pages/admin/attributes/AttributeList';
import AttributeCreate from '../pages/admin/attributes/AttributeCreate';
import AttributeTrash from '../pages/admin/attributes/AttributeTrash';

import UserList from '../pages/admin/users/UserList';
import UserDetail from '../pages/admin/users/UserDetail';
import UserCreate from '../pages/admin/users/UserCreate';

import ProductList from '../pages/admin/products/ProductList';
import ProductTrash from '../pages/admin/products/ProductTrash';
import ProductDetail from '../pages/admin/products/ProductDetail';
import ProductEdit from '../pages/admin/products/ProductEdit';
import ProductCreate from '../pages/admin/products/ProductCreate';



const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* ✅ Quản lý user */}
        <Route path="users" element={<UserList />} />
        <Route path="users/create" element={<UserCreate />} />
        <Route path="users/:id" element={<UserDetail />} />

        {/* ✅ Quản lý danh mục */}
        <Route path="categories" element={<CategoryList />} />
        <Route path="categories/create" element={<CategoryCreate />} />
        <Route path="categories/:id/edit" element={<CategoryEdit />} />
        <Route path="categories/trash" element={<CategoryTrash />} />

        {/* ✅ Quản lý thuộc tính */}
        <Route path="attributes" element={<AttributeList />} />
        <Route path="attributes/create" element={<AttributeCreate />} />
        <Route path="attributes/trash" element={<AttributeTrash />} />

        <Route path="products" element={<ProductList />} />
        <Route path="products/create" element={<ProductCreate />} />
        <Route path="products/trash" element={<ProductTrash />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />

      </Route>
    </Routes>
  );
};

export default AdminRoutes;
