import authApi, {
  LoginData,
  RegisterData,
  AuthResponse,
  AuthUser,
} from "../api/authApi";

const TOKEN_KEY = "access_token";
const USER_KEY = "user_data";
const REMEMBERED_EMAIL_KEY = "remembered_email";

const authService = {
  /**
   * Đăng ký tài khoản mới
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const res = await authApi.register(data);
      this.saveAuth(res);
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
   * Đăng nhập bằng Google OAuth token
   */
  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    try {
      const res = await authApi.loginWithGoogle(googleToken);
      this.saveAuth(res);
      return res;
    } catch (error: any) {
      console.error("Google login error:", error);
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
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Lấy thông tin user hiện tại từ localStorage
   */
  getCurrentUser(): AuthUser | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
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
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  },

  /**
   * Xóa toàn bộ thông tin đăng nhập
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Lưu email khi chọn "Ghi nhớ đăng nhập"
   */
  saveRememberedEmail(email: string): void {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  },

  /**
   * Lấy email đã lưu
   */
  getRememberedEmail(): string | null {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY);
  },

  /**
   * Xóa email đã lưu
   */
  clearRememberedEmail(): void {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  },

  /**
   * Cập nhật thông tin user trong localStorage
   */
  updateUser(user: Partial<AuthUser>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
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
   * Refresh token (nếu backend hỗ trợ)
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

export default authService;
