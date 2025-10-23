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
  size: Size;
  color: Color;
}

interface Product {
  id: number;
  name: string;
  created_at: string;
  min_variant: Variant | null;
  variants?: Variant[];
}

type FlatVariant = {
  vId: number;
  image: string | null;
  regularPrice: number;
  salePrice?: number;
  effectivePrice: number;
  size?: string;
  color?: string;
  productId: number;
  productName: string;
  productCreatedAt: string;
};

const IMG_BASE = "http://127.0.0.1:8000/";
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
          const goc =
            parsePrice(v.price) ??
            parsePrice(v.original_price) ??
            parsePrice(v.final_price);

          const km =
            parsePrice(v.sale_price) ??
            parsePrice(v.discount_price) ??
            (goc !== undefined && parsePrice(v.final_price) !== undefined && parsePrice(v.final_price)! < goc
              ? parsePrice(v.final_price)
              : undefined);

          if (goc === undefined) return;

          const effective = km !== undefined && km < goc ? km : goc;

          all.push({
            vId: v.id,
            image: v.image,
            regularPrice: goc,
            salePrice: km !== undefined && km < goc ? km : undefined,
            effectivePrice: effective,
            size: v.size?.value,
            color: v.color?.value,
            productId: p.id,
            productName: p.name,
            productCreatedAt: p.created_at,
          });
        };

        for (const p of products) {
          const src = (p.variants?.length ? p.variants : (p.min_variant ? [p.min_variant] : [])) as Variant[];
          for (const v of src) pushVariant(p, v);
        }

        const latest10 = [...all]
          .sort((a, b) => new Date(b.productCreatedAt).getTime() - new Date(a.productCreatedAt).getTime())
          .slice(0, 10);

        const cheapest10 = [...all]
          .sort((a, b) => a.effectivePrice - b.effectivePrice)
          .slice(0, 10);

        setVariantsLatest(latest10);
        setVariantsCheapest(cheapest10);
      } catch (e) {
        console.error("Lỗi khi lấy biến thể:", e);
        setVariantsLatest([]);
        setVariantsCheapest([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, []);

  const VariantCard: React.FC<{ v: FlatVariant }> = ({ v }) => {
    const discountPercent = v.salePrice !== undefined
      ? Math.round(((v.regularPrice - v.salePrice) / v.regularPrice) * 100)
      : 0;

    return (
      <Link
        to={`${PRODUCT_DETAIL_PATH_PREFIX}/${v.productId}`}
        className="group block rounded-lg border border-gray-200 bg-white overflow-hidden
                   shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {v.image ? (
            <img
              src={`${IMG_BASE}${v.image}`}
              alt={v.productName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {v.salePrice !== undefined && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
              -{discountPercent}%
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 
                        flex items-center justify-center">
            <div className="bg-white rounded-full p-2 opacity-0 scale-0 group-hover:opacity-100 
                          group-hover:scale-100 transition-all duration-300">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Name */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[2.5rem]">
            {v.productName}
          </h3>

          {/* Color & Size */}
          {(v.color || v.size) && (
            <div className="flex gap-1.5 mb-2 text-xs text-gray-600">
              {v.color && <span>Màu: {v.color}</span>}
              {v.color && v.size && <span>•</span>}
              {v.size && <span>Size: {v.size}</span>}
            </div>
          )}

          {/* Price */}
          <div className="pt-2 border-t border-gray-100">
            {v.salePrice !== undefined ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 line-through">{money(v.regularPrice)}</span>
                <span className="text-base font-bold text-red-600">{money(v.salePrice)}</span>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-base font-bold text-gray-900">{money(v.regularPrice)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  const Grid: React.FC<{ list: FlatVariant[] }> = ({ list }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {list.map((v) => (
        <VariantCard key={v.vId} v={v} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = (arr: unknown[]) => !arr || arr.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Latest */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sản phẩm mới nhất</h2>
        {isEmpty(variantsLatest) ? (
          <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>
        ) : (
          <Grid list={variantsLatest} />
        )}
      </section>

      {/* Cheapest */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Giá tốt nhất</h2>
        {isEmpty(variantsCheapest) ? (
          <div className="text-center py-12 text-gray-500">Chưa có sản phẩm</div>
        ) : (
          <Grid list={variantsCheapest} />
        )}
      </section>
    </div>
  );
};

export default OutstandingVariants;