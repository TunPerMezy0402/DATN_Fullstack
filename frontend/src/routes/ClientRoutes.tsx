import React from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/Layout/MainLayout";

// 🏠 Các trang client
import Home from "../layouts/client/Home";
import Banner from "../layouts/client/component/Banner";
import Menu from "../layouts/client/component/Menu";
import OutstandingProducts from "../layouts/client/component/OutstandingProducts";
import ServicesRow from "../layouts/client/component/ServicesRow";
import Trending from "../layouts/client/component/Trending";
import ProductsPage from "../layouts/client/component/ProductsPage";
import ProductDetail from "../layouts/client/component/ProductDetail";

// 📰 Các trang tin tức
import NewsLayout from "../layouts/NewsLayout"; // layout chứa sidebar + content
import NewsListDemo from "../pages/NewsListDemo";
import NewsArticleTop10 from "../components/News/NewsArticleTop10";
import NewsArticleTips from "../components/News/NewsArticleTips";
import NewsArticleReview from "../components/News/NewsArticleReview"; // ✅ Xu hướng giày sneaker 2025
import NewsArticlePromotion from "../components/News/NewsArticlePromotion"; // ✅ mới thêm
import NewsArticleStory from "../components/News/NewsArticleStory"; // ✅ Xu hướng sneaker 2025

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
