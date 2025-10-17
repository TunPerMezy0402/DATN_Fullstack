// src/api/productApi.ts
import axios from "axios";

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
  variation_status: number;
  created_at: string;
  updated_at: string;
  deleted_at: Nullable<string>;
  variants?: Variant[];
}

// ===== Axios instance =====
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Helpers to normalize Laravel resource structures =====
function unwrap<T>(resData: any, fallback: T): T {
  if (Array.isArray(resData)) return resData as T;
  if (Array.isArray(resData?.data)) return resData.data as T;
  if (Array.isArray(resData?.data?.data)) return resData.data.data as T;
  return fallback;
}

// ===== API funcs =====
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get("/admin/categories");
  return unwrap<Category[]>(data, []);
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get("/admin/products");
  return unwrap<Product[]>(data, []);
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/admin/products/${id}`);
}

// ===== Image helpers (re-useable) =====
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
