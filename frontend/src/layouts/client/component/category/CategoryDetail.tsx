import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  description?: string;
  image_url: string;
}

interface Pagination {
  current_page: number;
  last_page: number;
}

const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    last_page: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCategoryProducts = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `http://127.0.0.1:8000/api/categories/${id}/products?page=${pageNum}`
      );
      setCategory(res.data.category);
      setProducts(res.data.products.data);
      setPagination({
        current_page: res.data.products.current_page,
        last_page: res.data.products.last_page,
      });
    } catch (err) {
      console.error("Lỗi khi tải sản phẩm của danh mục:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCategoryProducts(1);
  }, [id]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.last_page) return;
    setPage(newPage);
    fetchCategoryProducts(newPage);
  };

  if (loading) return <div className="text-center py-10">Đang tải...</div>;
  if (!category) return <div className="text-center py-10">Không tìm thấy danh mục.</div>;

  return (
    <div className="container mx-auto p-4">
      <Link
        to="/categories"
        className="inline-block mb-4 text-blue-500 hover:underline"
      >
        ← Quay lại danh mục
      </Link>

      {/* Header danh mục */}
      <div className="text-center mb-8">
        <img
          src={category.image_url}
          alt={category.name}
          className="mx-auto w-40 h-40 object-cover rounded-full shadow-md mb-4"
        />
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mt-2">{category.description}</p>
        )}
      </div>

      {/* Danh sách sản phẩm */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="border rounded-2xl p-3 shadow hover:shadow-lg transition"
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-48 object-cover rounded-lg mb-2"
            />
            <h3 className="text-lg font-semibold truncate">{product.name}</h3>
            <p className="text-red-500 font-bold">
              {product.min_effective_price
                ? product.min_effective_price.toLocaleString() + " ₫"
                : "Liên hệ"}
            </p>
          </div>
        ))}
      </div>

      {/* Phân trang */}
      <div className="flex justify-center mt-8 space-x-2">
        <button
          disabled={pagination.current_page === 1}
          onClick={() => handlePageChange(page - 1)}
          className={`px-4 py-2 rounded-lg border ${
            pagination.current_page === 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-blue-50"
          }`}
        >
          Trước
        </button>

        <span className="px-4 py-2 border rounded-lg">
          Trang {pagination.current_page} / {pagination.last_page}
        </span>

        <button
          disabled={pagination.current_page === pagination.last_page}
          onClick={() => handlePageChange(page + 1)}
          className={`px-4 py-2 rounded-lg border ${
            pagination.current_page === pagination.last_page
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white hover:bg-blue-50"
          }`}
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default CategoryDetail;

