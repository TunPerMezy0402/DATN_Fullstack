// src/api/userApi.ts
import axiosClient from "./axiosClient";

// 🧩 Kiểu dữ liệu người dùng (đã cập nhật ENUM)
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // không bắt buộc khi hiển thị
  address?: string;
  phone?: string;
  role: string;
  created_at: string;
  updated_at: string;
  status: "active" | "inactive"; 
}

const userApi = {

  getAll: (params?: Record<string, any>): Promise<User[]> => {
    return axiosClient.get("/admin/users", { params });
  },

  getById: (id: string): Promise<User> => {
    return axiosClient.get(`/admin/users/${id}`);
  },

  create: (data: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> => {
    return axiosClient.post("/admin/users", data);
  },


  update: (id: string, data: Partial<User>): Promise<User> => {
    return axiosClient.put(`/admin/users/${id}`, data);
  },


  toggleStatus: (id: string, status: "active" | "inactive"): Promise<User> => {
    return axiosClient.put(`/admin/users/${id}`, { status });
  },
};

export default userApi;
