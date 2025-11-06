import React from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/Layout/MainLayout";

import Home from '../layouts/client/Home';
import Banner from '../layouts/client/component/Banner';
import Menu from '../layouts/client/component/Menu';
import OutstandingProducts from '../layouts/client/component/OutstandingProducts';
import ServicesRow from '../layouts/client/component//ServicesRow';
import Trending from '../layouts/client/component/Trending';

import ProductsPage from '../layouts/client/component/product/ProductsPage';
import ProductDetail from '../layouts/client/component/product/ProductDetail';

import CartList from '../layouts/client/component/cart/CartList';

import CheckoutPage from '../layouts/client/component/payment/CheckoutPage';

import Profile from '../layouts/client/component/profile/Profile';

import Success from '../layouts/client/component/payment/Success';
import InvoicePage from '../layouts/client/component/payment/InvoicePage';

import OrderUser from '../layouts/client/component/order/OrderUser';
import OrderUserDetail from '../layouts/client/component/order/OrderUserDetail';






/* import CategoryPage from '../layouts/client/component/CategoryPage';
import CategoryDetail from '../layouts/client/component/CategoryDetail'; */

// 📰 Các trang tin tức
import NewsLayout from "../layouts/NewsLayout"; // layout chứa sidebar + content
import NewsListDemo from "../pages/NewsListDemo";
import NewsArticleTop10 from "../components/News/NewsArticleTop10";
import NewsArticleTips from "../components/News/NewsArticleTips";
import NewsArticleReview from "../components/News/NewsArticleReview"; 
import NewsArticlePromotion from "../components/News/NewsArticlePromotion"; 
import NewsArticleStory from "../components/News/NewsArticleStory"; 

// ===============================================

const ClientRoutes = () => {
  return (
    <Routes>
      {/* Layout chính cho toàn site */}
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

{/*         <Route path="/categories" element={<CategoryPage />} />
        <Route path="/categories/:id" element={<CategoryDetail />} /> */}

        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        <Route path="/cart" element={<CartList />} />

        <Route path="/checkout" element={<CheckoutPage />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/payment/success" element={<Success />} />
        <Route path="/payment/invoice" element={<InvoicePage />} />

        <Route path="/orders" element={<OrderUser />} />
        <Route path="/orders/:id" element={<OrderUserDetail />} />



        {/* 📰 Trang tin tức có sidebar + nội dung */}
        <Route path="news" element={<NewsLayout />}>
          <Route index element={<NewsListDemo />} /> {/* Trang danh sách demo */}
          <Route path="trends" element={<NewsArticleTop10 />} /> {/* Top 10 đôi giày */}
          <Route path="tips" element={<NewsArticleTips />} /> {/* Cách bảo quản giày */}
          <Route path="review" element={<NewsArticleReview />} /> {/* Xu hướng sneaker */}
          <Route path="promotion" element={<NewsArticlePromotion />} /> {/* ✅ Khuyến mãi & sự kiện */}
          <Route path="story" element={<NewsArticleStory />} /> {/* ✅ Xu hướng giày sneaker 2025 */}

        </Route>
      </Route>
    </Routes>
  );
};

export default ClientRoutes;
