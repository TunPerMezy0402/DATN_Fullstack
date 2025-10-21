import React, { memo } from "react";
import { Link } from "react-router-dom";

const NewestProducts = () => {
  // Dữ liệu giả để hiển thị giao diện
  const products = [
    {
      _id: 1,
      name: "Nike Air Zoom Pegasus 41",
      brand: "Nike",
      price: 2999000,
      discount_price: 2499000,
      images: ["https://via.placeholder.com/300x200?text=Product+1"],
    },
    {
      _id: 2,
      name: "Adidas Ultraboost 23",
      brand: "Adidas",
      price: 3599000,
      discount_price: 3299000,
      images: ["https://via.placeholder.com/300x200?text=Product+2"],
    },
    {
      _id: 3,
      name: "Puma Deviate Nitro Elite",
      brand: "Puma",
      price: 2899000,
      discount_price: null,
      images: ["https://via.placeholder.com/300x200?text=Product+3"],
    },
    {
      _id: 4,
      name: "New Balance Fresh Foam 1080 v13",
      brand: "New Balance",
      price: 3199000,
      discount_price: 2999000,
      images: ["https://via.placeholder.com/300x200?text=Product+4"],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-gray-800 text-2xl font-extrabold">
            Sản phẩm <span className="text-green-500 font-normal">mới nhất</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Khám phá sản phẩm vừa ra mắt
          </p>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="scroll-wrapper overflow-x-auto">
        <div className="scroll-track flex gap-4 w-max">
          {products.map((product, idx) => (
            <div
              key={idx}
              className="w-[300px] flex-shrink-0 px-2 box-border"
            >
              <Link to={`/product/${product._id}`}>
                <div className="bg-white border border-gray-100 rounded-md shadow-sm hover:border-green-500 hover:shadow-md transition duration-300">
                  {/* Ảnh sản phẩm */}
                  <div className="relative bg-gray-100 p-4 flex justify-center items-center h-[160px]">
                    <img
                      alt={product.name}
                      className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out hover:scale-105"
                      src={product.images?.[0] || "/no-image.png"}
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold rounded px-2 py-0.5">
                      NEW
                    </div>
                  </div>

                  {/* Thông tin sản phẩm */}
                  <div className="px-3 pt-2 pb-3">
                    <p className="text-xs text-gray-400 font-normal">
                      {product.brand || "Thương hiệu"}
                    </p>
                    <h2
                      className="text-base font-semibold text-gray-900 mt-2 hover:text-green-600 hover:underline transition-all"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: "2.75rem",
                      }}
                    >
                      {product.name}
                    </h2>

                    {/* Giá sản phẩm */}
                    <div className="mt-1 text-sm font-medium text-green-600">
                      {product.discount_price
                        ? `${product.discount_price.toLocaleString()}₫`
                        : `${product.price.toLocaleString()}₫`}
                      {product.discount_price && (
                        <span className="line-through text-gray-400 text-xs ml-2">
                          {product.price.toLocaleString()}₫
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(NewestProducts);
