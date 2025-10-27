// services/productService.ts
// services/productService.ts
import axiosClient from "../api/axiosClient";

export type Product = {
  id: number;
  name: string;
  image?: string | null;
  image_url?: string | null;
  description?: string | null;
  brand?: string | null;
  origin?: string | null;
  price?: number | string | null;
  discount_price?: number | string | null;
  stock_quantity?: number | string | null;
  category?: { id: number; name: string } | null;
  variants?: any[];
  [k: string]: any;
};

const API_URL = "http://127.0.0.1:8000/api";
const ASSET_BASE = String(API_URL).replace(/\/api\/?$/, "");
export const toAssetUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${ASSET_BASE}/${String(u).replace(/^\/+/, "")}`;
};

/** Chuẩn hoá mảng ảnh từ string/JSON/array -> string[] (URL đầy đủ) */
const normalizeImages = (raw: unknown): string[] => {
  let arr: string[] = [];
  if (Array.isArray(raw)) arr = raw.filter(Boolean) as string[];
  else if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) arr = j.filter(Boolean) as string[];
      else arr = [raw];
    } catch {
      arr = raw.split(",").map(s => s.trim()).filter(Boolean);
    }
  }
  // map -> url đầy đủ và loại undefined/null
  return arr.map(i => toAssetUrl(i)).filter((x): x is string => Boolean(x));
};

/** Lấy chi tiết sản phẩm (client) – tự bắt mọi kiểu response Laravel hay trả */
export const fetchClientProductDetail = async (id: number): Promise<Product | null> => {
  try {
    // Nếu route bạn là /client/products/{id} thì đổi path ở đây
    const res = await axiosClient.get(`/products/${id}`);

    // Bắt đủ các kiểu envelope: {product}, {data:{product}}, {data}, {…}
    const raw =
      res.data?.product ??
      res.data?.data?.product ??
      res.data?.data ??
      res.data ??
      null;

    if (!raw) return null;

    // Chuẩn hoá variant
    const variants = Array.isArray(raw.variants)
      ? raw.variants.map((v: any) => ({
          ...v,
          image: v?.image ? toAssetUrl(v.image) : null,
          images: normalizeImages(v?.images),
          // số hoá các field quan trọng (đề phòng trả về string)
          price: v?.price != null ? Number(v.price) : null,
          discount_price: v?.discount_price != null ? Number(v.discount_price) : null,
          stock_quantity: v?.stock_quantity != null ? Number(v.stock_quantity) : 0,
          is_available: v?.is_available != null ? !!Number(v.is_available) : true,
        }))
      : [];

    const product: Product = {
      ...raw,
      image_url: raw?.image_url ? toAssetUrl(raw.image_url) : toAssetUrl(raw?.image),
      images: normalizeImages(raw?.images),
      variants,
      // cũng số hoá các field tổng
      price: raw?.price != null ? Number(raw.price) : null,
      discount_price: raw?.discount_price != null ? Number(raw.discount_price) : null,
      stock_quantity: raw?.stock_quantity != null ? Number(raw.stock_quantity) : 0,
    };

    return product;
  } catch (error) {
    // 404/500 sẽ vào đây -> FE hiểu là "Không tìm thấy sản phẩm"
    return null;
  }
};

// TS2305: getLikedIds
export const getLikedIds = async (): Promise<number[]> => {
    try {
        const res = await axiosClient.get("/user/liked-products");
        const likedProducts = Array.isArray(res.data?.data) ? res.data.data : [];
        
        // FIX: Explicitly set the type of 'id' to 'number'
        return likedProducts
            .map((p: any) => Number(p.id))
            .filter((id: number) => Number.isFinite(id)); // <-- Corrected line
            
    } catch (error) {
        // Suppress error if user is not logged in, just return empty array
        return [];
    }
};


// ---------------------------------------------------------------------
// 4. ADMIN PRODUCTS (Existing exports)
// ---------------------------------------------------------------------

export const getProducts = () => axiosClient.get("/admin/products");

// ... rest of your admin functions (getProduct, createProduct, etc.) ...

export const getProduct = (id: number) =>
  axiosClient.get(`/admin/products/${id}`); // trả về JSON {status, data} tuỳ BE

export const createProduct = (form: FormData) =>
  axiosClient.post("/admin/products", form, {
   
  });

export const updateProduct = (id: number, form: FormData) => {
  form.append("_method", "PUT");
  return axiosClient.post(`/admin/products/${id}`, form, {

  });

  
};

export const deleteProduct = (id: number) =>
  axiosClient.delete(`/admin/products/${id}`);


export const getCategories = async () => {
  const res = await axiosClient.get("/admin/categories");
  // Trả ra đúng mảng để component dùng thẳng
  return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
};