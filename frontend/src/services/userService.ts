// src/services/userService.ts
import userApi, { User } from "../api/userApi";

const userService = {
  /**
   * 🧭 Lấy danh sách người dùng đang hoạt động (status = 'active')
   */
  async getActiveUsers(): Promise<User[]> {
    const users = await userApi.getAll();
    return users.filter((user) => user.status === "active");
  },

  /**
   * 🔍 Lấy chi tiết người dùng và chuẩn hóa dữ liệu
   */
  async getUserDetail(id: string): Promise<User> {
    const user = await userApi.getById(id);
    return {
      ...user,
      name: user.name?.trim() || "",
      email: user.email?.toLowerCase() || "",
    };
  },

  /**
   * ➕ Tạo người dùng mới
   */
  async createUser(data: Omit<User, "id">): Promise<User> {
    return userApi.create(data);
  },

  /**
   * ✏️ Cập nhật thông tin người dùng
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return userApi.update(id, data);
  },

  /**
   * 🔄 Thay đổi trạng thái người dùng (active <-> inactive)
   */
  async toggleUserStatus(id: string, currentStatus: "active" | "inactive"): Promise<User> {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    return userApi.update(id, { status: newStatus });
  },
};

export default userService;
