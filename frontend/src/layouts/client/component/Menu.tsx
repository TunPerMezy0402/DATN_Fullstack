import React, { memo, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/api";

interface Category {
  id: number;
  name: string;
  image_url: string | null;
}

const PAGE_SIZE = 5;

const Menu: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get<{ categories: Category[] }>("/");
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error("Lỗi khi lấy categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(categories.length / PAGE_SIZE)),
    [categories.length]
  );

  const start = page * PAGE_SIZE;
  const visible = useMemo(
    () => categories.slice(start, start + PAGE_SIZE),
    [categories, start]
  );

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const goPage = (dir: -1 | 1) => {
    if ((dir === -1 && !canPrev) || (dir === 1 && !canNext)) return;
    setPage((p) => p + dir);
  };

  const goToCategory = (catId: number) => {
    navigate(`/products/category/${catId}`);
  };

  if (loading) {
    return (
      <div className="mt-10 relative max-w-7xl mx-auto">
        <div className="px-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-5 shadow"
              >
                <div className="h-14 w-14 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 mt-3 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!categories.length) {
    return <p className="text-center text-gray-500 py-6">Chưa có danh mục để hiển thị.</p>;
  }

  return (
    <div className="mt-10 relative max-w-7xl mx-auto">
      {/* Nút TRÁI — icon-only, đặt hẳn ra hai bên, không đè grid nhờ padding ngang */}
      <button
        type="button"
        onClick={() => goPage(-1)}
        aria-label="Trang trước"
        disabled={!canPrev}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full
          bg-white/95 shadow-lg border border-gray-200 flex items-center justify-center
          hover:bg-white transition ${!canPrev ? "opacity-40 pointer-events-none" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* GRID: chỉ render đúng 5 item đang xem; phần còn lại ẨN (không render DOM) */}
      <div className="px-16"> {/* chừa chỗ cho nút 2 bên */}
        <div
          key={page} // đổi key để kích hoạt animation mỗi lần chuyển trang
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 animate-cat-page"
        >
          {visible.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => goToCategory(cat.id)}
              title={`Xem sản phẩm: ${cat.name}`}
              aria-label={`Xem sản phẩm danh mục ${cat.name}`}
              className="group flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50
                         border border-gray-200 hover:border-teal-500 rounded-2xl p-5 shadow hover:shadow-lg
                         transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2
                         focus:ring-teal-500 focus:ring-offset-2 cursor-pointer"
            >
              <div className="relative">
                <img
                  alt={`${cat.name} logo`}
                  className="mx-auto h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-110"
                  src={cat.image_url || "/fallback-image.jpg"}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/fallback-image.jpg";
                  }}
                />
              </div>
              <p
                className="text-sm font-semibold text-gray-800 mt-3 group-hover:text-teal-600 transition truncate max-w-[9rem]"
                title={cat.name}
              >
                {cat.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Nút PHẢI — icon-only */}
      <button
        type="button"
        onClick={() => goPage(1)}
        aria-label="Trang sau"
        disabled={!canNext}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full
          bg-white/95 shadow-lg border border-gray-200 flex items-center justify-center
          hover:bg-white transition ${!canNext ? "opacity-40 pointer-events-none" : ""}`}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Dấu chấm trang (tuỳ chọn) */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition ${
                i === page ? "bg-teal-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* CSS animation nhỏ khi đổi trang */}
      <style>{`
        @keyframes catFadeSlide {
          0%   { opacity: 0; transform: translateX(10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-cat-page { animation: catFadeSlide .35s ease-out both; }
      `}</style>
    </div>
  );
};

export default memo(Menu);
