// src/api/userApi.ts
import axiosClient from "./axiosClient";

// Kiểu dữ liệu cho user
export interface User {
  _id: string;
  name: string;
  email: string;
  address: string;
  role: string;
  status: boolean;
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
  create: (data: Omit<User, "_id">): Promise<User> => {
    return axiosClient.post("/admin/users", data);
  },

  // ✏️ Cập nhật người dùng
  update: (id: string, data: Partial<User>): Promise<User> => {
    return axiosClient.put(`/admin/users/${id}`, data);
  },

  // 🗑️ Xóa người dùng
  delete: (id: string): Promise<void> => {
    return axiosClient.delete(`/admin/users/${id}`);
  },
};

export default userApi;
