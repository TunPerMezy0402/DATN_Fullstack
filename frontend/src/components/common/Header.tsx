import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const navigate = useNavigate();

  const slogans = [
    "Giao hàng siêu tốc chỉ trong 2 giờ",
    "Ưu đãi mỗi ngày – Mua sắm không giới hạn",
    "Sản phẩm chính hãng, đổi trả dễ dàng",
    "Mua sắm online an toàn & tiện lợi",
    "Hàng triệu người tin dùng mỗi ngày",
  ];

  // 🔹 Chuyển slogan tự động
  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % slogans.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Kiểm tra login và lấy wishlist/cart từ localStorage
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user_data");
    if (token && userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);

      // Lấy wishlist và cart từ localStorage
      const wishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWishlistCount(wishlist.length);

      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const totalItems = cart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      setCartCount(totalItems);
    } else {
      setUser(null);
      setWishlistCount(0);
      setCartCount(0);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
    setUser(null);
    navigate("/login");
  };

  const handleGoToProfile = () => {
    navigate("/profile");
  };

  const handleGoToWishlist = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/wishlist");
  };

  const handleGoToCart = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/cart");
  };

  const toggleDropdown = () => setShowDropdown((prev) => !prev);
  const toggleUserDropdown = () => setShowUserDropdown((prev) => !prev);

  return (
    <header className="bg-gradient-to-r from-green-50 via-white to-green-50 border-b border-gray-100 text-xs text-gray-600">
      {/* Top Bar */}
      <div className="bg-[#f8f8fb] border-b border-gray-100 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-8 px-4">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1">
              <i className="fas fa-phone-alt text-xs"></i> +0878888907
            </span>
            <span className="flex items-center gap-1">
              <i className="fab fa-whatsapp text-xs"></i> +0878888888
            </span>
          </div>

          <div className="text-center hidden md:block transition-opacity duration-500 text-sm font-medium text-gray-600">
            {slogans[sloganIndex]}
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-700">
              Help?
            </a>
            <a href="#" className="hover:text-gray-700">
              Track Order?
            </a>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
              English <i className="fas fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto py-4 px-4 flex flex-wrap justify-between items-center gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img
            src="/image/logo.png"
            alt="Velora Logo"
            className="h-[70px] w-[70px] rounded-md ml-8"
          />
        </div>

        {/* Search Bar */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full border border-gray-200 rounded-md py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400"
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-700">
              <i className="fas fa-search text-sm"></i>
            </div>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4 text-center flex-shrink-0 relative">
          {user ? (
            <div className="relative">
              <div
                onClick={toggleUserDropdown}
                className="flex items-center gap-2 cursor-pointer"
              >
                <i className="far fa-user text-2xl text-gray-700"></i>
                <div className="text-left">
                  <span className="text-xs font-medium">
                    {user?.name || "Người dùng"}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Tài khoản của tôi
                  </span>
                </div>
              </div>

              {/* Dropdown menu */}
              {showUserDropdown && (
                <div className="absolute bg-white shadow-lg rounded w-40 mt-2 right-0 z-20">
                  <button
                    onClick={handleGoToProfile}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Thông tin cá nhân
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">
              <i className="far fa-user text-2xl text-gray-700"></i>
              <div className="text-left">
                <Link to="/login" className="text-xs block hover:underline">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-medium block hover:underline"
                >
                  Đăng ký
                </Link>
              </div>
            </div>
          )}

          {/* Wishlist */}
          <div
            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
            onClick={handleGoToWishlist}
          >
            <i className="far fa-heart text-2xl"></i>
            <div>
              <div className="text-xs">{wishlistCount}-ITEMS</div>
              <div className="text-xs font-medium">Yêu thích</div>
            </div>
          </div>

          {/* Cart */}
          <div
            className="flex items-center gap-2 hover:text-gray-900 cursor-pointer"
            onClick={handleGoToCart}
          >
            <i className="fas fa-shopping-bag text-2xl text-gray-800"></i>
            <div>
              <div className="text-xs">{cartCount}-ITEMS</div>
              <div className="text-xs font-medium">Giỏ hàng</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-y border-gray-100">
        <div className="max-w-7xl mx-auto h-12 flex justify-between items-center px-8">
          {/* Left - All Categories */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 bg-[#5caf90] hover:bg-green-500 text-white px-4 py-2 rounded text-sm"
            >
              <i className="fas fa-th-large"></i>
              <span>Danh mục</span>
              <i className="fas fa-chevron-down text-[10px]"></i>
            </button>

            {showDropdown && (
              <div className="absolute mt-2 w-48 bg-white rounded shadow-lg z-10">
                <ul>
                  <li className="block px-4 py-2 hover:bg-green-100 text-gray-700">
                    Giày nam
                  </li>
                  <li className="block px-4 py-2 hover:bg-green-100 text-gray-700">
                    Giày nữ
                  </li>
                  <li className="block px-4 py-2 hover:bg-green-100 text-gray-700">
                    Giày thể thao
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Center - Links */}
          <div className="flex gap-x-8 text-sm font-normal font-sans">
            {[{ path: "/", label: "Trang chủ" },
              { path: "/products", label: "Sản phẩm" },
              { path: "/blog", label: "Tin tức" },
              { path: "/compare", label: "So sánh" },
              { path: "/lien_he", label: "Liên hệ" },
            ].map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative text-gray-700 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-[2px] after:bg-green-600 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right - Location */}
          <button className="flex items-center gap-2 bg-[#5caf90] hover:bg-green-500 text-white px-4 py-2 rounded text-sm">
            <i className="fas fa-map-marker-alt"></i>
            <span>Việt Nam</span>
            <i className="fas fa-chevron-down text-[10px]"></i>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
