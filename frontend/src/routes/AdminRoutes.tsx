import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/admin/layouts/AdminLayout';
import Dashboard from '../layouts/admin/Dashboard';

import CategoryList from '../pages/admin/category/CategoryList';
import CategoryCreate from '../pages/admin/category/CategoryCreate';
import CategoryTrash from '../pages/admin/category/CategoryTrash';
import CategoryEdit from '../pages/admin/category/CategoryEdit';

import AttributeList from '../pages/admin/attributes/AttributeList';
import AttributeTrash from '../pages/admin/attributes/AttributeTrash';

import UserList from '../pages/admin/users/UserList';
import UserDetail from '../pages/admin/users/UserDetail';
import UserCreate from '../pages/admin/users/UserCreate';

import ProductList from '../pages/admin/products/ProductList';
import ProductTrash from '../pages/admin/products/ProductTrash';
import ProductDetail from '../pages/admin/products/ProductDetail';
import ProductEdit from '../pages/admin/products/ProductEdit';
import ProductCreate from '../pages/admin/products/ProductCreate';

import CouponList from '../pages/admin/coupons/CouponList';

import OrderList from '../pages/admin/orders/OrderList';
import OrderDetail from '../pages/admin/orders/OrderDetail';




import BannerList from "../pages/admin/banner/BannerList";
import BannerAdd from "../pages/admin/banner/BannerAdd";
import BannerEdit from "../pages/admin/banner/BannerEdit";

import Payment from "../pages/admin/vnpay/Transaction";



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
        <Route path="attributes/trash" element={<AttributeTrash />} />

        <Route path="products" element={<ProductList />} />
        <Route path="products/create" element={<ProductCreate />} />
        <Route path="products/trash" element={<ProductTrash />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />

        <Route path="coupons" element={<CouponList />} />

        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:id" element={<OrderDetail />} />


         <Route path="banners" element={<BannerList />} />
        <Route path="banners/add/" element={<BannerAdd />} />
        <Route path="banners/edit/:id" element={<BannerEdit />} />

        <Route path="payment" element={<Payment />} />

 

        <Route path="orders" element={<OrderList />} />
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
