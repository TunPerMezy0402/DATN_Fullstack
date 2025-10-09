import axios, { AxiosError } from "axios";

// ======================= CONFIG =======================

// URL API backend
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// Tạo axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ======================= INTERCEPTORS =======================

// ✅ Thêm token vào header trước khi gửi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Xử lý lỗi response chung (ví dụ 401 → redirect login)
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ======================= TYPES =======================

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface ApiResponse<T> {
  status: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
  data?: T;
}

// ======================= API METHODS =======================

const authApi = {
  /**
   * Đăng nhập
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        data
      );

      if (response.data.status && response.data.token && response.data.user) {
        return {
          token: response.data.token,
          user: response.data.user,
        };
      }

      throw new Error(response.data.message || "Đăng nhập thất bại");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Đăng nhập thất bại"
        : "Có lỗi xảy ra khi đăng nhập";
      throw new Error(message);
    }
  },

  /**
   * Đăng ký
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/register",
        data
      );

      if (response.data.status && response.data.token && response.data.user) {
        return {
          token: response.data.token,
          user: response.data.user,
        };
      }

      throw new Error(response.data.message || "Đăng ký thất bại");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Đăng ký thất bại"
        : "Có lỗi xảy ra khi đăng ký";
      throw new Error(message);
    }
  },

  /**
   * Đăng nhập Google (token từ @react-oauth/google)
   */
  async loginWithGoogle(googleToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/google/callback",
        { token: googleToken }
      );

      if (response.data.status && response.data.token && response.data.user) {
        return {
          token: response.data.token,
          user: response.data.user,
        };
      }

      throw new Error(response.data.message || "Đăng nhập Google thất bại");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Đăng nhập Google thất bại"
        : "Có lỗi xảy ra khi đăng nhập Google";
      throw new Error(message);
    }
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await apiClient.get<ApiResponse<AuthUser>>("/auth/me");

      if (response.data.status && response.data.user) {
        return response.data.user;
      }

      throw new Error("Không thể lấy thông tin user");
    } catch (error) {
      throw new Error("Không thể lấy thông tin user");
    }
  },

  /**
   * Quên mật khẩu
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        "/forgot-password",
        { email }
      );
      return { message: response.data.message };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Không thể gửi email reset password"
        : "Không thể gửi email reset password";
      throw new Error(message);
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
      const response = await apiClient.post<ApiResponse<any>>("/reset-password", {
        token,
        password,
        password_confirmation: password,
      });
      return { message: response.data.message };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Không thể reset password"
        : "Không thể reset password";
      throw new Error(message);
    }
  },

  /**
   * Refresh token (nếu backend hỗ trợ)
   */
  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>("/refresh");

      if (response.data.status && response.data.token && response.data.user) {
        return {
          token: response.data.token,
          user: response.data.user,
        };
      }
      return null;
    } catch (error) {
      console.error("Refresh token error:", error);
      return null;
    }
  },

  /**
   * Cập nhật profile
   */
  async updateProfile(data: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const response = await apiClient.put<ApiResponse<AuthUser>>("/profile", data);
      if (response.data.status && response.data.user) {
        return response.data.user;
      }
      throw new Error("Không thể cập nhật thông tin");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Không thể cập nhật thông tin"
        : "Không thể cập nhật thông tin";
      throw new Error(message);
    }
  },

  /**
   * Đổi mật khẩu
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.put<ApiResponse<any>>("/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      });
      return { message: response.data.message };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || "Không thể đổi mật khẩu"
        : "Không thể đổi mật khẩu";
      throw new Error(message);
    }
  },
};

export default authApi;
