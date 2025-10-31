import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/api";

interface Size { id: number; value: string; }
interface Color { id: number; value: string; }

interface Variant {
  id: number;
  image: string | null;
  final_price?: string;
  price?: string;
  original_price?: string;
  sale_price?: string;
  discount_price?: string;
  size?: Size;
  color?: Color;
}

interface BrandOrCategory { id: number; name: string; }
interface Product {
  id: number;
  name: string;
  brand: BrandOrCategory | string;
  category: BrandOrCategory | string;
  origin: BrandOrCategory | string;
  created_at: string;
  image?: string | null;
  variants?: Variant[];
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

const IMG_BASE = "http://127.0.0.1:8000";
const PRODUCT_DETAIL_PATH_PREFIX = "/products";

const parsePrice = (v: any): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = Number.parseFloat(String(v));
  return Number.isNaN(n) ? undefined : n;
};

const money = (n: number) => `${n.toLocaleString()}₫`;

const OutstandingVariants: React.FC = () => {
  const [variantsLatest, setVariantsLatest] = useState<FlatVariant[]>([]);
  const [variantsCheapest, setVariantsCheapest] = useState<FlatVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const res = await api.get<{ products: Product[] }>("/");
        const products = res.data.products || [];
        const all: FlatVariant[] = [];

        const pushVariant = (p: Product, v: Variant) => {
          const goc = parsePrice(v.price) ?? parsePrice(v.original_price) ?? parsePrice(v.final_price);
          const km =
            parsePrice(v.sale_price) ??
            parsePrice(v.discount_price) ??
            (parsePrice(v.final_price) !== undefined && parsePrice(v.final_price)! < (goc ?? Infinity)
              ? parsePrice(v.final_price)
              : undefined);
          if (!goc) return;
          const effective = km !== undefined && km < goc ? km : goc;

          const getName = (field: any): string => {
            if (!field) return "—";
            if (typeof field === "string") return field;
            return field?.name || "—";
          };

          all.push({
            vId: v.id,
            image: v.image,
            productImage: p.image || null,
            regularPrice: goc,
            salePrice: km !== undefined && km < goc ? km : undefined,
            effectivePrice: effective,
            size: v.size?.value,
            color: v.color?.value,
            productId: p.id,
            productName: p.name,
            brand: getName(p.brand),
            category: getName(p.category),
            origin: getName(p.origin),
            productCreatedAt: p.created_at,
          });
        };

        for (const p of products) {
          if (!p.variants || p.variants.length === 0) continue;
          // Lấy biến thể giá thấp nhất
          const minVariant = p.variants
            .map((v) => {
              const goc = parsePrice(v.price) ?? parsePrice(v.original_price) ?? parsePrice(v.final_price);
              const km = parsePrice(v.sale_price) ?? parsePrice(v.discount_price) ?? (parsePrice(v.final_price) !== undefined && parsePrice(v.final_price)! < (goc ?? Infinity) ? parsePrice(v.final_price) : undefined);
              if (!goc) return null;
              const effective = km !== undefined && km < goc ? km : goc;
              return { variant: v, effectivePrice: effective };
            })
            .filter(Boolean)
            .sort((a, b) => a!.effectivePrice - b!.effectivePrice)[0]?.variant;
          if (minVariant) pushVariant(p, minVariant);
        }

        // Sắp xếp
        const latest10 = [...all]
          .sort((a, b) => new Date(b.productCreatedAt).getTime() - new Date(a.productCreatedAt).getTime())
          .slice(0, 10);

        const cheapest10 = [...all].sort((a, b) => a.effectivePrice - b.effectivePrice).slice(0, 10);

        setVariantsLatest(latest10);
        setVariantsCheapest(cheapest10);
      } catch (e) {
        console.error("❌ Lỗi khi lấy biến thể:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, []);

  const VariantCard: React.FC<{ v: FlatVariant }> = ({ v }) => {
    const discountPercent = v.salePrice ? Math.round(((v.regularPrice - v.salePrice) / v.regularPrice) * 100) : 0;
    const imageUrl = v.productImage || v.image ? (v.productImage || v.image)!.startsWith("http") ? (v.productImage || v.image)! : `${IMG_BASE}/${v.productImage || v.image}` : null;

    return (
      <Link to={`${PRODUCT_DETAIL_PATH_PREFIX}/${v.productId}`} className="group bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200">
        <div className="relative w-full pt-[100%] bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={v.productName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">Không có ảnh</div>
          )}
          {v.salePrice !== undefined && discountPercent > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 h-10 group-hover:text-blue-600 transition-colors">{v.productName}</h3>

          <div className="text-xs text-gray-600 space-y-0.5">
            <div className="flex justify-between"><span>Danh mục:</span> <span className="font-medium text-gray-900">{v.category}</span></div>
            <div className="flex justify-between"><span>Thương hiệu:</span> <span className="font-medium text-gray-900">{v.brand}</span></div>
            <div className="flex justify-between"><span>Xuất xứ:</span> <span className="font-medium text-gray-900">{v.origin}</span></div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            {v.salePrice ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 line-through">{money(v.regularPrice)}</span>
                  <span className="text-xs text-red-600 font-semibold">-{money(v.regularPrice - v.salePrice)}</span>
                </div>
                <div className="text-right"><span className="text-lg font-bold text-red-600">{money(v.salePrice)}</span></div>
              </div>
            ) : (
              <div className="text-right"><span className="text-lg font-bold text-gray-900">{money(v.regularPrice)}</span></div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  const Grid: React.FC<{ list: FlatVariant[] }> = ({ list }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {list.map((v) => (<VariantCard key={v.vId} v={v} />))}
    </div>
  );

  if (loading) return <div className="text-center py-12">Đang tải...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-blue-600 rounded"></div>
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm mới nhất</h2>
        </div>
        {variantsLatest.length ? <Grid list={variantsLatest} /> : <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-red-600 rounded"></div>
          <h2 className="text-2xl font-bold text-gray-900">Giá tốt nhất</h2>
        </div>
        {variantsCheapest.length ? <Grid list={variantsCheapest} /> : <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>}
      </section>
    </div>
  );
};

export default OutstandingVariants;
