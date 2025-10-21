import React, { useState } from "react";
import { Link } from "react-router-dom";
import Banner from "./component/Banner";
import OutstandingProducts from "./component/OutstandingProducts";
import Menu from "./component/Menu";
import ServicesRow from "./component/ServicesRow";
import Trending from "./component/Trending";
import { FaArrowUp } from "react-icons/fa";

function Home() {
  // Dữ liệu sản phẩm mẫu
  const mockProducts = [
    {
      _id: "1",
      name: "Giày Sneaker Nam Trắng",
      origin: "Việt Nam",
      discount_price: 650000,
      price: 850000,
      images: ["https://via.placeholder.com/400x300?text=Giay+1"],
    },
    {
      _id: "2",
      name: "Giày Thể Thao Nike Air",
      origin: "Mỹ",
      discount_price: 1200000,
      price: 1500000,
      images: ["https://via.placeholder.com/400x300?text=Giay+2"],
    },
    {
      _id: "3",
      name: "Giày Adidas Classic",
      origin: "Đức",
      discount_price: 990000,
      price: 1250000,
      images: ["https://via.placeholder.com/400x300?text=Giay+3"],
    },
    {
      _id: "4",
      name: "Giày Vans Checkerboard",
      origin: "Mỹ",
      discount_price: 890000,
      price: 1090000,
      images: ["https://via.placeholder.com/400x300?text=Giay+4"],
    },
  ];

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
  className="fixed bottom-6 right-6 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition text-sm font-bold"
  title="Lên đầu trang"
>
  ↑
</button>

      )}
    </div>
  );
}

export default Home;
