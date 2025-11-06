import React, { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBanners } from "../../../api/bannerApi";

const Banner = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await getAllBanners();
        const data = res.data || [];

        // ✅ Lọc banner đang active
        const active = data.filter((b) => b.is_active);

        // ✅ Lấy ảnh đầu tiên từ images
        const fixed = active.map((b) => ({
          ...b,
          image_url: b.images?.[0]?.image_url || null,
        }));

        setBanners(fixed);
      } catch (err) {
        console.error("Lỗi lấy banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [banners]);

  if (loading || banners.length === 0) return null;

  const current = banners[currentIndex];

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <img
        src={current.image_url}
        alt={current.title}
        className="w-full h-[500px] object-cover"
      />

      {/* Prev Button */}
      <button
        onClick={() =>
          setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)
        }
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/70 rounded-full w-10 h-10 flex items-center justify-center"
      >
        &lt;
      </button>

      {/* Next Button */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/70 rounded-full w-10 h-10 flex items-center justify-center"
      >
        &gt;
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full ${
              i === currentIndex ? "bg-white" : "bg-white/50"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default memo(Banner);
