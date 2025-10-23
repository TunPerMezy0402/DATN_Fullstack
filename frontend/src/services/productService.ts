// services/productService.ts
import axiosClient from "../api/axiosClient";

// ── Products ─────────────────────────────────────────────────────────
export const getProducts = () => axiosClient.get("/admin/products");

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