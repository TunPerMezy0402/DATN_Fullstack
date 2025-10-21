import React, { memo, useEffect, useState } from "react";
import axios from "axios";

interface Category {
  id: number;
  name: string;
  image?: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/categories");
        setCategories(response.data.data || response.data);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return <p className="text-center mt-10 text-gray-600">Đang tải danh mục...</p>;
  }

  return (
    <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 max-w-7xl mx-auto px-2">
      {categories.map((category, index) => (
        <div
          key={index}
          className="group flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-teal-500 rounded-2xl p-5 shadow hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <img
              alt={`${category.name}`}
              className="mx-auto h-14 w-14 object-contain"
              src={
                category.image?.startsWith("http")
                  ? category.image
                  : `http://127.0.0.1:8000/storage/${category.image}`
              }
            />
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-3 group-hover:text-teal-600 transition">
            {category.name}
          </p>
        </div>
      ))}
    </div>
  );
};

export default memo(Categories);
