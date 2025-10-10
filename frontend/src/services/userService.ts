// src/services/userService.ts
import userApi, { User } from "../api/userApi";

const userService = {
  /**
   * 🧭 Lấy danh sách người dùng đang hoạt động (active)
   * Gọi API rồi lọc theo isActive
   */
  async getActiveUsers(): Promise<User[]> {
    const users = await userApi.getAll();
    return users.filter((user) => user.status !== 1);
  },

  /**
   * 🔍 Lấy chi tiết 1 người dùng + format dữ liệu
   */
  async getUserDetail(id: string): Promise<User> {
    const user = await userApi.getById(id);
    return {
      ...user,
      name: user.name.trim(),
      email: user.email.toLowerCase(),
    };
  },

  /**
   * ➕ Tạo người dùng mới
   */
  async createUser(data: Omit<User, "_id">): Promise<User> {
    return userApi.create(data);
  },

  /**
   * ✏️ Cập nhật thông tin người dùng
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return userApi.update(id, data);
  },

};

export default userService;
