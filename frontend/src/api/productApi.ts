// src/api/productApi.ts
import axios from "axios";

/* =======================
 * Types & Nullable
 * ======================= */
export type Nullable<T> = T | null;

export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Variant {
  id: number;
  product_id: number;
  size_id: Nullable<number>;
  color_id: Nullable<number>;
  image: Nullable<string>;
  images: Nullable<string[] | string>;
  sku: Nullable<string>;
  price: Nullable<string>;
  discount_price: Nullable<string>;
  stock_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: Nullable<string>;
  size?: { id: number; value: string };
  color?: { id: number; value: string };
  final_price?: number | string | null;
}

export interface Product {
  id: number;
  name: string;
  category_id: Nullable<number>;
  description: Nullable<string>;
  sku: Nullable<string>;
  origin: Nullable<string>;
  brand: Nullable<string>;
  price: Nullable<string>;
  stock_quantity: number;
  images: Nullable<string[] | string>;
  image?: Nullable<string>;
  /** có nơi trả string/number/null → cho rộng để không lỗi */
  discount_price: Nullable<string> | number | null;
  variation_status: number;
  created_at: string;
  updated_at: string;
  deleted_at: Nullable<string>;
  variants?: Variant[];
  sold_quantity?: number;
  /** các field BE client có thể gắn thêm */
  image_url?: string | null;
  min_variant?: Variant | null;
  min_effective_price?: number | string | null;
  [k: string]: any;
}

/* =======================
 * DTOs
 * ======================= */
export interface VariantCreatePayload {
  size_id: Nullable<number>;
  color_id: Nullable<number>;
  image: Nullable<string>;
  images?: string[];
  sku: Nullable<string>;
  price: Nullable<string>;
  discount_price: Nullable<string>;
  stock_quantity: number;
  is_available: boolean;
}

export interface CreateProductDTO {
  name: string;
  category_id: Nullable<number>;
  description: Nullable<string>;
  sku: Nullable<string>;
  origin: Nullable<string>;
  brand: Nullable<string>;
  images?: string[];
  variation_status: 0 | 1 | boolean;
  variants?: VariantCreatePayload[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

/* =======================
 * Axios instance
 * ======================= */
export const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  (import.meta as any)?.env?.REACT_APP_API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    } as any;
  }
  return config;
});

/* =======================
 * Helpers
 * ======================= */
const ASSET_BASE = String(API_URL).replace(/\/api\/?$/, "");

const isNonEmpty = (s?: string | null) => !!s && s.trim() !== "";

const nonnullStrArr = (arr?: (string | null | undefined)[]) =>
  (arr || []).filter((u) => isNonEmpty(u as any)) as string[];

/** unwrap mảng từ nhiều dạng envelope khác nhau */
function unwrapArray<T>(resData: any, fallback: T[]): T[] {
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray(resData?.data)) return resData.data as T[];
  if (Array.isArray(resData?.data?.data)) return resData.data.data as T[];
  if (Array.isArray(resData?.products)) return resData.products as T[];
  if (Array.isArray(resData?.data?.products)) return resData.data.products as T[];
  return fallback;
}

/** unwrap object từ nhiều dạng envelope khác nhau */
function unwrapObj<T>(resData: any): T {
  return (resData?.data ?? resData) as T;
}

/** number | null an toàn */
const toNumberOrNull = (v: any): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
};

/** money string | null */
const normalizeMoneyString = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
};

/** Build URL đầy đủ cho asset (Laravel storage, v.v.) */
export const toAssetUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${ASSET_BASE}/${String(u).replace(/^\/+/, "")}`;
};

/** Parse ảnh từ JSON/string/csv/array → string[] (đã chuẩn hoá sang URL đầy đủ) */
export const parseImages = (imgs: Product["images"] | Variant["images"]) => {
  if (!imgs) return [] as string[];
  let arr: string[] = [];
  if (Array.isArray(imgs)) arr = imgs.filter(Boolean) as string[];
  else {
    try {
      const parsed = JSON.parse(imgs as string);
      if (Array.isArray(parsed)) arr = parsed.filter(Boolean) as string[];
      else arr = [String(imgs)];
    } catch {
      arr = String(imgs).split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return arr.map(toAssetUrl).filter(Boolean) as string[];
};

export const firstImage = (imgs: Product["images"] | Variant["images"]) => {
  const list = parseImages(imgs);
  return list[0] ?? null;
};

export const toCurrency = (v: any) => {
  const num = typeof v === "string" ? Number(v) : v;
  if (isNaN(num)) return "—";
  return num.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

/* ===================================================================
 *                CLIENT / PUBLIC ENDPOINTS
 *  - Public: /products, /products/{id}
 *  - Categories (homepage blocks): /client/categories
 * =================================================================== */

/** Danh mục + tối đa 10 SP/DM (homepage) */
export async function fetchClientCategoriesWithProducts(): Promise<any[]> {
  const { data } = await api.get("/client/categories");
  const arr =
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data) && data) ||
    [];
  return arr.map((c: any) => ({
    ...c,
    image_url: c.image_url ? toAssetUrl(c.image_url) : toAssetUrl(c.image),
    products: (c.products || []).map((p: any) => ({
      ...p,
      image: p.image_url ?? toAssetUrl(p.image),
      images: parseImages(p.images),
      variants: Array.isArray(p.variants)
        ? p.variants.map((v: any) => ({
            ...v,
            image: v.image ? toAssetUrl(v.image) : v.image,
            images: parseImages(v.images),
          }))
        : [],
    })),
  }));
}

/** Danh mục rút gọn (id, name) → dùng cho filter Select */
export async function fetchClientCategories(): Promise<{ id: number; name: string }[]> {
  const full = await fetchClientCategoriesWithProducts();
  return full.map((c: any) => ({ id: Number(c.id), name: String(c.name) }));
}

/** Chi tiết 1 danh mục + products phân trang */
export async function fetchClientCategoryProducts(
  id: number,
  page = 1
): Promise<{ category: any; products: any[]; meta: any }> {
  const { data } = await api.get(`/client/categories/${id}`, { params: { page } });
  const cat = data?.category ?? null;
  const paginator = data?.products ?? {};
  const prods = Array.isArray(paginator?.data) ? paginator.data : [];

  return {
    category: {
      ...cat,
      image_url: cat?.image_url ? toAssetUrl(cat.image_url) : toAssetUrl(cat?.image),
    },
    products: prods.map((p: any) => ({
      ...p,
      image: p.image_url ?? toAssetUrl(p.image),
      images: parseImages(p.images),
      variants: Array.isArray(p.variants)
        ? p.variants.map((v: any) => ({
            ...v,
            image: v.image ? toAssetUrl(v.image) : v.image,
            images: parseImages(v.images),
          }))
        : [],
    })),
    meta: {
      current_page: paginator?.current_page ?? 1,
      last_page: paginator?.last_page ?? 1,
      total: paginator?.total ?? prods.length,
      per_page: paginator?.per_page ?? 9,
    },
  };
}

/** Danh sách sản phẩm (public) → GET /api/products */
/** Danh sách sản phẩm (public) → GET /api/products */
export async function fetchClientProducts(params?: {
  page?: number;
  per_page?: number;
  sort?: string;
  category_id?: number | string;
}): Promise<Product[]> {
  const { data } = await api.get("/products", { params });

  // Bắt nhiều shape khác nhau: [], {data:[]}, {products:[]}, {products:{data:[]}}, {data:{data:[]}}, v.v.
  const extractProducts = (payload: any): any[] => {
    const d = payload?.data ?? payload;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.products)) return d.products;
    if (Array.isArray(d?.products?.data)) return d.products.data;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.data?.data)) return d.data.data;
    return [];
  };

  const raw = extractProducts(data);

  // Chuẩn hoá ảnh & biến thể sang URL đầy đủ
  return raw.map((p: any) => ({
    ...p,
    image: p.image_url ?? (p.image ? toAssetUrl(p.image) : undefined),
    images: parseImages(p.images),
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          ...v,
          image: v.image ? toAssetUrl(v.image) : v.image,
          images: parseImages(v.images),
        }))
      : [],
  })) as Product[];
}

/** Chi tiết sản phẩm (public) → GET /api/products/{id} */
/** ========================
 * Chi tiết sản phẩm (public)
 * GET /api/products/{id}
 * ======================== */
export async function fetchClientProduct(id: number): Promise<{ product: Product }> {
  const { data } = await api.get(`/products/${id}`);

  // 🧩 Lấy đúng key product (vì BE trả { product: {...} })
  const p: any = data?.product ?? data?.data ?? data;
  if (!p) throw new Error("Không tìm thấy sản phẩm.");

  // 🧰 Chuẩn hoá thông tin sản phẩm và các biến thể (giống Admin)
  const product: Product = {
    ...p,
    // Ảnh chính
    image_url: p.image_url ? toAssetUrl(p.image_url) : toAssetUrl(p.image),
    image: p.image_url ?? (p.image ? toAssetUrl(p.image) : undefined),
    images: parseImages(p.images),

    // Biến thể đầy đủ
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => {
          const price = v.price ?? 0;
          const discount = v.discount_price && Number(v.discount_price) < Number(price)
            ? v.discount_price
            : null;

          return {
            ...v,
            image: v.image ? toAssetUrl(v.image) : null,
            images: parseImages(v.images),
            price: String(price),
            discount_price: discount ? String(discount) : null,
            stock_quantity: v.stock_quantity ?? 0,
            final_price: discount ?? price,
            size: v.size ? { ...v.size, value: String(v.size.value) } : undefined,
            color: v.color ? { ...v.color, value: String(v.color.value) } : undefined,
          };
        })
      : [],

    // Đảm bảo có min_variant
    min_variant:
      Array.isArray(p.variants) && p.variants.length > 0
        ? p.variants.reduce((min: any, v: any) => {
            const price = Number(v.discount_price ?? v.price);
            if (!min || price < Number(min.discount_price ?? min.price)) return v;
            return min;
          }, null)
        : null,
  };

  return { product };
}


/* ===================================================================
 *                ADMIN / PRIVATE ENDPOINTS (GIỮ NGUYÊN)
 * =================================================================== */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get("/admin/categories");
  return unwrapArray<Category>(data, []);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get("/admin/products");
  return unwrapArray<Product>(data, []);
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await api.get(`/admin/products/${id}`);
  return unwrapObj<Product>(data);
}

export async function createProduct(payload: CreateProductDTO): Promise<Product> {
  const normalized: CreateProductDTO = {
    ...payload,
    category_id: toNumberOrNull(payload.category_id),
    images: nonnullStrArr(payload.images),
    variation_status: payload.variation_status ? 1 : 0,
    variants: (payload.variants || []).map((v) => ({
      size_id: toNumberOrNull(v.size_id),
      color_id: toNumberOrNull(v.color_id),
      image: isNonEmpty(v.image) ? (v.image as string) : null,
      images: nonnullStrArr(v.images),
      sku: isNonEmpty(v.sku) ? (v.sku as string) : null,
      price: normalizeMoneyString(v.price),
      discount_price: normalizeMoneyString(v.discount_price),
      stock_quantity: Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0,
      is_available: !!v.is_available,
    })),
  };

  const { data } = await api.post(`/admin/products`, normalized);
  return unwrapObj<Product>(data);
}

export async function updateProduct(id: number, payload: UpdateProductDTO): Promise<Product> {
  const normalized: UpdateProductDTO = {
    ...payload,
    category_id:
      payload.category_id !== undefined ? toNumberOrNull(payload.category_id) : undefined,
    images: payload.images ? nonnullStrArr(payload.images) : undefined,
    variation_status:
      typeof payload.variation_status === "boolean"
        ? payload.variation_status
          ? 1
          : 0
        : payload.variation_status,
    variants: payload.variants
      ? payload.variants.map((v) => ({
          size_id: toNumberOrNull(v.size_id),
          color_id: toNumberOrNull(v.color_id),
          image: isNonEmpty(v.image) ? (v.image as string) : null,
          images: nonnullStrArr(v.images),
          sku: isNonEmpty(v.sku) ? (v.sku as string) : null,
          price: normalizeMoneyString(v.price),
          discount_price: normalizeMoneyString(v.discount_price),
          stock_quantity: Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0,
          is_available: !!v.is_available,
        }))
      : undefined,
  };

  const { data } = await api.put(`/admin/products/${id}`, normalized);
  return unwrapObj<Product>(data);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

export async function fetchTrashedProducts(): Promise<Product[]> {
  const { data } = await api.get(`/admin/products/trash`);
  return unwrapArray<Product>(data, []);
}

export async function restoreProduct(id: number): Promise<void> {
  await api.post(`/admin/products/${id}/restore`);
}

export async function forceDeleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}/force-delete`);
}
