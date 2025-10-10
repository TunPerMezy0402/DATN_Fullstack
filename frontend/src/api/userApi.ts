// src/api/userApi.ts
import axiosClient from "./axiosClient";

// Kiểu dữ liệu cho user
export interface User {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  role: string;
  created_at: string;
  updated_at: string;
  status: number | string; // 0: Hoạt động, 1: Tạm ngưng
}

const userApi = {
  // 🧭 Lấy danh sách người dùng
  getAll: (params?: Record<string, any>): Promise<User[]> => {
    return axiosClient.get("/admin/users", { params });
  },

  // 🔍 Lấy chi tiết người dùng
  getById: (id: string): Promise<User> => {
    return axiosClient.get(`/admin/users/${id}`);
  },

  // ➕ Tạo mới người dùng
  create: (data: Omit<User, "id">): Promise<User> => {
    return axiosClient.post("/admin/users", data);
  },

  // ✏️ Cập nhật người dùng
  update: (id: string, data: Partial<User>): Promise<User> => {
    return axiosClient.put(`/admin/users/${id}`, data);
  },

};

export default userApi;