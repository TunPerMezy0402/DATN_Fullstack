import React, { useState } from "react";
import { Link } from "react-router-dom";
import Banner from "./component/Banner";
import OutstandingProducts from "./component/OutstandingProducts";
import Menu from "./component/Menu";
import Trending from "./component/Trending";
import ServicesRow from "./component/ServicesRow";

import { FaArrowUp } from "react-icons/fa";

function Home() {
  // Dữ liệu sản phẩm mẫu

  const [visibleCount, setVisibleCount] = useState(4);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Cuộn lên đầu trang
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Giả lập toggle nút cuộn (bạn có thể xóa nếu không cần)
  window.onscroll = () => {
    setShowScrollTop(window.scrollY > 300);
  };

  // Xử lý khi bấm “Xem thêm”
  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 4);
  };

  return (
    <div className="overflow-x-hidden">
      <Banner />
      <Menu />
      <OutstandingProducts />
      <Trending />
      <ServicesRow />

      {/* Nút lên đầu trang */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="
      fixed bottom-6 left-1/2 transform -translate-x-1/2
      bg-green-500 text-white p-3 rounded-full shadow-lg
      hover:bg-green-600 transition text-sm font-bold
    "
          title="Lên đầu trang"
        >
          ↑
        </button>
      )}

    </div>
  );
}

export default Home;
