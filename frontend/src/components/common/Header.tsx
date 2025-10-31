import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/client/logo/logo.png";
import "@fortawesome/fontawesome-free/css/all.min.css";
import authService from "../../services/authService";
import axios from "axios";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";
const BACKEND_ORIGIN = (() => {
  try {
    const url = new URL(API_URL);
    return url.origin;
  } catch {
    return "http://127.0.0.1:8000";
  }
})();

const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sloganIndex, setSloganIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [avatarBust, setAvatarBust] = useState<number>(0);
  const navigate = useNavigate();

  const slogans = [
    "Giao hàng siêu tốc chỉ trong 2 giờ",
    "Ưu đãi mỗi ngày – Mua sắm không giới hạn",
    "Sản phẩm chính hãng, đổi trả dễ dàng",
    "Mua sắm online an toàn & tiện lợi",
    "Hàng triệu người tin dùng mỗi ngày",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % slogans.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authService.isAuthenticated()) {
      const u: any = authService.getCurrentUser();
      if (u) {
        const raw = (u.image || u.avatar) as string | undefined;
        if (raw && !/^https?:\/\//i.test(raw)) {
          const normalized = `${BACKEND_ORIGIN}/${raw.replace(/^\//, "")}`;
          const next = { ...u, image: normalized, avatar: normalized };
          setUser(next);
          authService.updateUser({ avatar: normalized } as any);
        } else {
          setUser(u);
        }
      } else {
        setUser(null);
      }
    } else setUser(null);
  }, []);

  // Bổ sung: hàm tải profile mới nhất
  const loadProfile = useCallback(async () => {
    try {
      if (!authService.isAuthenticated()) return;
      const token = authService.getToken();
      const res = await axios.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const srvUser = res.data?.user as any;
      if (srvUser) {
        const raw = (srvUser.image || srvUser.avatar) as string | undefined;
        const absolute = raw
          ? (/^https?:\/\//i.test(raw) ? raw : `${BACKEND_ORIGIN}/${String(raw).replace(/^\//, "")}`)
          : undefined;

        setUser((prev: any) => ({ ...(prev || {}), ...srvUser, image: absolute, avatar: absolute }));
        const mapped = {
          id: srvUser.id,
          name: srvUser.name,
          email: srvUser.email,
          role: srvUser.role,
          phone: srvUser.phone,
          avatar: absolute,
        } as any;
        authService.updateUser(mapped);
        setAvatarBust(Date.now());
      }
    } catch { }
  }, []);

  // Luôn tải avatar mới nhất từ server khi mount để tránh dữ liệu cũ
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Lắng nghe sự kiện cập nhật profile để refresh avatar
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const newAvatar = ce?.detail?.avatar as string | undefined;
      if (newAvatar) {
        const absolute = /^https?:\/\//i.test(newAvatar)
          ? newAvatar
          : `${BACKEND_ORIGIN}/${newAvatar.replace(/^\//, "")}`;
        setUser((prev: any) => ({ ...(prev || {}), image: absolute, avatar: absolute }));
        authService.updateUser({ avatar: absolute } as any);
        setAvatarBust(Date.now());
      } else {
        loadProfile();
      }
    };
    window.addEventListener("profile-updated", handler as EventListener);
    return () => window.removeEventListener("profile-updated", handler as EventListener);
  }, [loadProfile]);

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutConfirm = async () => {
    try {
      await authService.logout();
    } finally {
      setShowLogoutConfirm(false);
      window.location.href = "/login";
    }
  };

  const navLinks = [
    { path: "/", label: "Trang chủ" },
    { path: "/products", label: "Sản phẩm" },
    { path: "/blog", label: "Tin tức" },
    { path: "/compare", label: "So sánh" },
    { path: "/lien_he", label: "Liên hệ" },
  ];

  return (
    <header className="bg-gradient-to-r from-green-50 via-white to-green-50 border-b border-gray-100 text-xs text-gray-600 relative">
      {/* ==== Top Bar ==== */}
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

          <div className="text-center hidden md:block text-sm font-medium text-gray-600 transition-opacity duration-500">
            {slogans[sloganIndex]}
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-700">Help?</a>
            <a href="#" className="hover:text-gray-700">Track Order?</a>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
              English <i className="fas fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* ==== Main Header ==== */}
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-4" style={{ paddingTop: '6px', paddingBottom: '6px' }}>

        {/* Logo */}
        <div className="flex-shrink-0">
          <img src={logo} alt="Logo" className="h-[70px] w-[70px] rounded-md ml-8" />
        </div>

        {/* Search */}
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

        {/* User + Cart */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Giỏ hàng */}
          <div
            onClick={() => navigate("/cart")}
            className="relative cursor-pointer hover:text-green-600 transition-colors"
          >
            <i className="fas fa-shopping-cart text-xl"></i>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold px-[5px] py-[1px] rounded-full">
                {cartCount}
              </span>
            )}
          </div>

          {/* User */}
          {user && localStorage.getItem("access_token") ? (
            <div className="relative">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user?.image || user?.avatar ? (
                  <img
                    src={`${(() => {
                      const raw = (user.image || user.avatar) as string;
                      if (/^https?:\/\//i.test(raw)) return raw + (avatarBust ? `?v=${avatarBust}` : "");
                      const abs = `${BACKEND_ORIGIN}/${raw.replace(/^\//, "")}`;
                      return abs + (avatarBust ? `?v=${avatarBust}` : "");
                    })()}`}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />

                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <i className="far fa-user text-white text-lg"></i>
                  </div>
                )}
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-800">{user?.name || "Người dùng"}</div>
                  <div className="text-xs text-gray-500">Tài khoản của tôi</div>
                </div>
                <i className={`fas fa-chevron-${showUserMenu ? "up" : "down"} text-xs text-gray-500 ml-2`}></i>
              </div>

              {/* Menu user */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bg-white shadow-lg rounded-lg w-48 mt-2 right-0 z-20 border border-gray-100"
                  >
                    <div className="py-2">
                      <Link to="/profile" onClick={() => setShowUserMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600">
                        <i className="far fa-user mr-2"></i> Thông tin cá nhân
                      </Link>
                      <Link to="/orders" onClick={() => setShowUserMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600">
                        <i className="fas fa-shopping-bag mr-2"></i> Đơn hàng của tôi
                      </Link>
                      <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i> Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <i className="far fa-user text-gray-600 text-lg"></i>
              </div>
              <div className="text-left">
                <Link to="/login" className="text-xs font-medium block hover:text-green-600 transition-colors">Đăng nhập</Link>
                <Link to="/register" className="text-xs text-gray-500 block hover:text-green-600 transition-colors">Đăng ký ngay</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==== Menu Điều Hướng ==== */}
      <nav className="bg-white border-t border-gray-100 flex justify-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-x-8 text-sm font-normal font-sans py-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="relative text-gray-700 after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-[2px] after:bg-green-600 after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ==== Xác nhận đăng xuất ==== */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 w-[360px] text-center border border-gray-100"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Xác nhận đăng xuất</h3>
              <p className="text-sm text-gray-500 mb-6">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-all">Hủy</button>
                <button onClick={handleLogoutConfirm} className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all">Đăng xuất</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
