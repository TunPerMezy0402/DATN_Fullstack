import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

interface Product {
  id: number;
  name: string;
  image_url: string;
  min_effective_price?: number | null;
}

interface Category {
  id: number;
  name: string;
  image_url: string;
  products?: Product[];
}

const CategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/categories")
      .then((res) => {
        setCategories(res.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi khi tải danh mục:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center py-10">Đang tải...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Danh mục sản phẩm</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="border rounded-2xl shadow p-4 hover:shadow-lg transition"
          >
            <Link to={`/categories/${cat.id}`}>
              <img
                src={cat.image_url}
                alt={cat.name}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
              <h2 className="text-xl font-semibold mb-3 text-center">
                {cat.name}
              </h2>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              {cat.products?.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg overflow-hidden shadow-sm"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-28 object-cover"
                  />
                  <div className="p-2 text-sm text-center">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-red-500 font-semibold">
                      {product.min_effective_price
                        ? product.min_effective_price.toLocaleString() + " ₫"
                        : "Liên hệ"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-4">
              <Link
                to={`/categories/${cat.id}`}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
