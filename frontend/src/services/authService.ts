import authApi, {
  googleAuthApi,
  LoginData,
  RegisterData,
  AuthResponse,
  AuthUser,
} from "../api/authApi";

// ======================= CONSTANTS =======================

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";
const REMEMBERED_EMAIL_KEY = "remembered_email";

// ======================= STORAGE HELPERS =======================

const storage = {
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),

  setUser: (user: AuthUser) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  getUser: (): AuthUser | null => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  removeUser: () => localStorage.removeItem(USER_KEY),

  setRememberedEmail: (email: string) =>
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email),
  getRememberedEmail: (): string | null =>
    localStorage.getItem(REMEMBERED_EMAIL_KEY),
  removeRememberedEmail: () => localStorage.removeItem(REMEMBERED_EMAIL_KEY),
  
  clearAll: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  },
};

// ======================= AUTH SERVICE =======================

const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  async register(data: RegisterData): Promise<{ message: string }> {
    try {
      const res = await authApi.register(data);
      return res;
    } catch (error: any) {
      console.error("Register error:", error);
      throw error;
    }
  },

  /**
   * Đăng nhập bằng email / password
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const res = await authApi.login(data);
      this.saveAuth(res);
      return res;
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      this.clearAuth();
      // Đảm bảo xóa cả email đã ghi nhớ khi logout
      this.clearRememberedEmail();
    }
  },

  /**
   * Quên mật khẩu
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      return await authApi.forgotPassword(email);
    } catch (error: any) {
      console.error("Forgot password error:", error);
      throw error;
    }
  },

  /**
   * Reset mật khẩu
   */
  async resetPassword(
    token: string,
    password: string
  ): Promise<{ message: string }> {
    try {
      return await authApi.resetPassword(token, password);
    } catch (error: any) {
      console.error("Reset password error:", error);
      throw error;
    }
  },

  /**
   * Lấy token từ localStorage
   */
  getToken(): string | null {
    return storage.getToken();
  },

  /**
   * Lấy thông tin user hiện tại từ localStorage
   */
  getCurrentUser(): AuthUser | null {
    return storage.getUser();
  },

  /**
   * Kiểm tra user đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Kiểm tra user có role cụ thể không
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  },

  /**
   * Lưu thông tin token và user
   */
  saveAuth(res: AuthResponse): void {
    storage.setToken(res.token);
    storage.setUser(res.user);
  },

  /**
   * Xóa toàn bộ thông tin đăng nhập
   */
  clearAuth(): void {
    storage.clearAll();
  },

  /**
   * Lưu email khi chọn "Ghi nhớ đăng nhập"
   */
  saveRememberedEmail(email: string): void {
    storage.setRememberedEmail(email);
  },

  /**
   * Lấy email đã lưu
   */
  getRememberedEmail(): string | null {
    return storage.getRememberedEmail();
  },

  /**
   * Xóa email đã lưu
   */
  clearRememberedEmail(): void {
    storage.removeRememberedEmail();
  },

  /**
   * Cập nhật thông tin user trong localStorage
   */
  updateUser(user: Partial<AuthUser>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      storage.setUser(updatedUser);
    }
  },

  /**
   * Kiểm tra token có hết hạn chưa
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.exp) {
        return Date.now() >= payload.exp * 1000;
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }

    return false;
  },

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const res = await authApi.refreshToken();
      if (res) {
        this.saveAuth(res);
        return res;
      }
    } catch (error) {
      console.error("Refresh token error:", error);
      this.clearAuth();
    }
    return null;
  },

  /**
   * Lấy thông tin user mới nhất từ server
   */
  async fetchCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await authApi.getCurrentUser();
      if (user) {
        this.updateUser(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error("Fetch current user error:", error);
      return null;
    }
  },
};

// ======================= GOOGLE AUTH SERVICE =======================

export const googleAuthService = {
  /**
   * Đăng nhập bằng Google
   */
  async login(credential: string): Promise<AuthResponse> {
    try {
      const res = await googleAuthApi.login(credential);
      authService.saveAuth(res);
      return res;
    } catch (error: any) {
      console.error("Google login error:", error);
      throw error;
    }
  },

  /**
   * Đăng ký bằng Google
   */
  async register(credential: string): Promise<{ message: string }> {
    try {
      const res = await googleAuthApi.register(credential);
      return res;
    } catch (error: any) {
      console.error("Google register error:", error);
      throw error;
    }
  },

  /**
   * Xử lý Google OAuth callback (dùng chung cho login/register)
   */
  handleCallback: async (
    credential: string,
    isRegister: boolean = false
  ): Promise<AuthResponse | { message: string }> => {
    return isRegister
      ? googleAuthService.register(credential)
      : googleAuthService.login(credential);
  },
};

export default authService;