import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

/* ------------ Base URL + Axios ------------ */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const api = axios.create({ baseURL: API_URL, timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    (config.headers as any) = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

/* ------------ Interfaces ------------ */
interface Category {
  id: number;
  name: string;
  image?: string;
}

interface Variant {
  id: number;
  image: string | null;
  stock_quantity?: number;
  size?: { id: number; value: string };
  color?: { id: number; value: string };
}

interface Product {
  id: number;
  name: string;
  sku?: string;
  description?: string;
  category_id?: number;
  image?: string;
  image_url?: string;
  brand?: string;
  origin?: string;
  created_at: string;
  variants?: Variant[];
  min_variant?: any;
  min_effective_price?: number;
  min_original_price?: number;
  category?: Category;
  sizes?: string[];
  colors?: string[];
}

interface FlatVariant {
  vId: number;
  image: string | null;
  productImage: string | null;
  regularPrice: number;
  salePrice?: number;
  effectivePrice: number;
  size?: string;
  color?: string;
  productId: number;
  productName: string;
  brand: string;
  category: string;
  origin: string;
  productCreatedAt: string;
}

/* ------------ Helpers ------------ */
const IMG_BASE = "http://127.0.0.1:8000/";
const PRODUCT_DETAIL_PATH_PREFIX = "/products";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)} đ`;

const stockSum = (variants: Variant[]): number =>
  (variants || []).reduce(
    (sum: number, v: Variant) => sum + (Number(v?.stock_quantity ?? 0) || 0),
    0
  );

/* ------------ Main Component ------------ */
const OutstandingVariants: React.FC = () => {
  const [variantsLatest, setVariantsLatest] = useState<FlatVariant[]>([]);
  const [variantsCheapest, setVariantsCheapest] = useState<FlatVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        // Gọi API giống ProductsPage: /client/products với tất cả sản phẩm
        const res = await api.get<{ products: { data: Product[] } }>("/client/products", {
          params: { per_page: 1000 } // Lấy nhiều sản phẩm để lọc
        });

        const products = res.data.products?.data || [];
        const all: FlatVariant[] = [];

        // Xử lý từng sản phẩm
        for (const p of products) {
          if (!p.variants || p.variants.length === 0) continue;

          // Tính tổng stock của product
          const totalStock = stockSum(p.variants);
          if (totalStock === 0) continue; // Bỏ qua sản phẩm hết hàng

          // Lấy giá thấp nhất từ min_effective_price
          const effectivePrice = p.min_effective_price;
          const originalPrice = p.min_original_price;

          if (!effectivePrice) continue;

          // Lấy variant có giá thấp nhất hoặc variant đầu tiên
          const bestVariant = p.min_variant || p.variants[0];

          const getName = (field: any): string => {
            if (!field) return "—";
            if (typeof field === "string") return field;
            return field?.name || "—";
          };

          all.push({
            vId: bestVariant.id,
            image: bestVariant.image,
            productImage: p.image_url || p.image || null,
            regularPrice: originalPrice || effectivePrice,
            salePrice: originalPrice && originalPrice > effectivePrice ? effectivePrice : undefined,
            effectivePrice: effectivePrice,
            size: bestVariant.size?.value,
            color: bestVariant.color?.value,
            productId: p.id,
            productName: p.name,
            brand: p.brand || "—",
            category: getName(p.category),
            origin: p.origin || "—",
            productCreatedAt: p.created_at,
          });
        }

        // Sắp xếp sản phẩm mới nhất (theo created_at)
        const latest10 = [...all]
          .sort((a, b) => new Date(b.productCreatedAt).getTime() - new Date(a.productCreatedAt).getTime())
          .slice(0, 10);

        // Sắp xếp sản phẩm giá tốt nhất (theo effectivePrice)
        const cheapest10 = [...all]
          .sort((a, b) => a.effectivePrice - b.effectivePrice)
          .slice(0, 10);

        setVariantsLatest(latest10);
        setVariantsCheapest(cheapest10);
      } catch (e) {
        console.error("❌ Lỗi khi lấy sản phẩm:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, []);

  /* ------------ Variant Card Component ------------ */
  const VariantCard: React.FC<{ v: FlatVariant }> = ({ v }) => {
    const discountPercent = v.salePrice 
      ? Math.round(((v.regularPrice - v.salePrice) / v.regularPrice) * 100) 
      : 0;

    const imageUrl = v.productImage || v.image 
      ? (v.productImage || v.image)!.startsWith("http") 
        ? (v.productImage || v.image)! 
        : `${IMG_BASE}${v.productImage || v.image}`
      : null;

    return (
      <Link
        to={`${PRODUCT_DETAIL_PATH_PREFIX}/${v.productId}`}
        className="group bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200"
      >
        <div className="relative w-full pt-[100%] bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={v.productName}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Không có ảnh
            </div>
          )}
          
          {/* Discount Badge */}
          {v.salePrice !== undefined && discountPercent > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 h-10 group-hover:text-blue-600 transition-colors">
            {v.productName}
          </h3>

          <div className="text-xs text-gray-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Danh mục:</span>
              <span className="font-medium text-gray-900">{v.category}</span>
            </div>
            <div className="flex justify-between">
              <span>Thương hiệu:</span>
              <span className="font-medium text-gray-900">{v.brand}</span>
            </div>
            <div className="flex justify-between">
              <span>Xuất xứ:</span>
              <span className="font-medium text-gray-900">{v.origin}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            {v.salePrice ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 line-through">
                    {money(v.regularPrice)}
                  </span>
                  <span className="text-xs text-red-600 font-semibold">
                    -{money(v.regularPrice - v.salePrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-red-600">
                    {money(v.salePrice)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">
                  {money(v.regularPrice)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  /* ------------ Grid Component ------------ */
  const Grid: React.FC<{ list: FlatVariant[] }> = ({ list }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {list.map((v) => (
        <VariantCard key={v.vId} v={v} />
      ))}
    </div>
  );

  /* ------------ Loading State ------------ */
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Đang tải...</p>
      </div>
    );
  }

  /* ------------ Main Render ------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Sản phẩm mới nhất */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-blue-600 rounded"></div>
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm mới nhất</h2>
        </div>
        {variantsLatest.length ? (
          <Grid list={variantsLatest} />
        ) : (
          <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-red-600 rounded"></div>
          <h2 className="text-2xl font-bold text-gray-900">Giá tốt nhất</h2>
        </div>
        {variantsCheapest.length ? (
          <Grid list={variantsCheapest} />
        ) : (
          <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>
        )}
      </section>
    </div>
  );
};

export default OutstandingVariants;