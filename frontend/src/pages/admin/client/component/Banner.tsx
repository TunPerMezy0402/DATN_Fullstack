import React, { useState, memo } from "react";

const Banner = () => {
  const banners = [
    {
      id: 1,
      title: "Giày thể thao mới nhất",
      image: "",
    },
    {
      id: 2,
      title: "Giảm giá cực sốc 50%",
      image: "",
    },
    {
      id: 3,
      title: "Sưu tập giày xuân 2025",
      image: "",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const current = banners[currentIndex];

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <img
        src={current.image}
        alt={current.title}
        className="w-full h-[500px] object-cover shadow transition-all duration-500 ease-in-out cursor-pointer rounded-xl"
      />

      {/* Nút chuyển trái */}
      <button
        onClick={prevSlide}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow z-20"
      >
        &lt;
      </button>

      {/* Nút chuyển phải */}
      <button
        onClick={nextSlide}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-10 h-10 flex items-center justify-center shadow z-20"
      >
        &gt;
      </button>

      {/* Dấu chấm slide */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {banners.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              i === currentIndex ? "bg-white" : "bg-white/50"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default memo(Banner);