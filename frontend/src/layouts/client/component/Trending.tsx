import React, { memo } from "react";

const Trending = () => {
  const items = [
    {
      title: "VẬN CHUYỂN SIÊU TỐC",
      desc: "Vận chuyển nội thành HN trong 2 tiếng!",
    },
    {
      title: "HỖ TRỢ 24/7",
      desc: "Đội ngũ hỗ trợ khách hàng tận tình.",
    },
    {
      title: "BẢO HÀNH DÀI LÂU",
      desc: "Cam kết chất lượng, đổi trả dễ dàng.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-800 mb-10">
        Dịch vụ nổi bật
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-center">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-6 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
          >
            {/* Có thể thay icon bằng emoji nếu muốn */}
            <div className="text-4xl mb-3">🚚</div>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(Trending);
