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
  discount_price: Nullable<string>;
  variation_status: number; // 0 | 1 từ BE
  created_at: string;
  updated_at: string;
  deleted_at: Nullable<string>;
  variants?: Variant[];
}

/* =======================
 * DTOs
 * ======================= */
export interface VariantCreatePayload {
  size_id: Nullable<number>;
  color_id: Nullable<number>;
  image: Nullable<string>;
  images?: string[]; // luôn gửi mảng string hợp lệ
  sku: Nullable<string>; // CHUỖI
  price: Nullable<string>; // CHUỖI
  discount_price: Nullable<string>; // CHUỖI
  stock_quantity: number;
  is_available: boolean;
}

export interface CreateProductDTO {
  name: string;
  category_id: Nullable<number>;
  description: Nullable<string>;
  sku: Nullable<string>; // CHUỖI
  origin: Nullable<string>;
  brand: Nullable<string>;
  images?: string[]; // mảng URL
  variation_status: 0 | 1 | boolean; // FE cho phép boolean, BE nhận 0/1
  variants?: VariantCreatePayload[];
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

/* =======================
 * Axios instance
 * ======================= */
const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
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
const isNonEmpty = (s?: string | null) => !!s && s.trim() !== "";

const nonnullStrArr = (arr?: (string | null | undefined)[]) =>
  (arr || []).filter((u) => isNonEmpty(u as any)) as string[];

/** unwrap mảng từ nhiều dạng envelope khác nhau */
function unwrapArray<T>(resData: any, fallback: T[]): T[] {
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray(resData?.data)) return resData.data as T[];
  if (Array.isArray(resData?.data?.data)) return resData.data.data as T[];
  return fallback;
}

/** unwrap object từ nhiều dạng envelope khác nhau */
function unwrapObj<T>(resData: any): T {
  return (resData?.data ?? resData) as T;
}

/** Ép number | null an toàn cho category_id, size_id, color_id */
const toNumberOrNull = (v: any): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
};

/** Giữ money dạng string hoặc null (để đúng với DTO/DB hiện tại) */
const normalizeMoneyString = (v: any): string | null => {
  if (v === null || v === undefined || v === "") return null;
  // Nếu là số, convert thẳng sang string
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  // Nếu là string có thể parse được thành số => giữ nguyên dạng string đã trim
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
};

/* =======================
 * Categories
 * ======================= */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get("/admin/categories");
  return unwrapArray<Category>(data, []);
}

/* =======================
 * Products (list/detail)
 * ======================= */
export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get("/admin/products");
  return unwrapArray<Product>(data, []);
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await api.get(`/admin/products/${id}`);
  return unwrapObj<Product>(data);
}

/* =======================
 * Create / Update
 * ======================= */
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
      sku: isNonEmpty(v.sku) ? (v.sku as string) : null, // CHUỖI
      price: normalizeMoneyString(v.price), // CHUỖI
      discount_price: normalizeMoneyString(v.discount_price), // CHUỖI
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
          sku: isNonEmpty(v.sku) ? (v.sku as string) : null, // CHUỖI
          price: normalizeMoneyString(v.price), // CHUỖI
          discount_price: normalizeMoneyString(v.discount_price), // CHUỖI
          stock_quantity: Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0,
          is_available: !!v.is_available,
        }))
      : undefined,
  };

  const { data } = await api.put(`/admin/products/${id}`, normalized);
  return unwrapObj<Product>(data);
}

/* =======================
 * Delete / Trash / Restore
 * ======================= */
export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

export async function fetchTrashedProducts(): Promise<Product[]> {
  const { data } = await api.get(`/admin/products/trash`);
  return unwrapArray<Product>(data, []);
}

export async function restoreProduct(id: number): Promise<void> {
  // Nếu BE dùng POST thay vì PATCH, đổi dòng dưới cho phù hợp
  await api.patch(`/admin/products/${id}/restore`);
}

export async function forceDeleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}/force-delete`);
}

/* =======================
 * Image utils
 * ======================= */
export const parseImages = (imgs: Product["images"] | Variant["images"]) => {
  if (!imgs) return [] as string[];
  if (Array.isArray(imgs)) return imgs.filter(Boolean) as string[];
  try {
    const parsed = JSON.parse(imgs as string);
    return Array.isArray(parsed) ? (parsed.filter(Boolean) as string[]) : [imgs as string];
  } catch {
    return [imgs as string];
  }
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
