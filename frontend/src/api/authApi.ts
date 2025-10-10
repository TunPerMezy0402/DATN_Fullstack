import axiosClient from "./axiosClient";
import { AxiosError } from "axios";

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

export interface GoogleAuthData {
  credential: string;
}

interface ApiResponse<T> {
  status: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
  data?: T;
}

// ======================= HELPER FUNCTIONS =======================

const handleApiError = (error: unknown, defaultMessage: string): Error => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || defaultMessage;
    return new Error(message);
  }
  return new Error(defaultMessage);
};

const validateAuthResponse = (
  response: ApiResponse<AuthResponse>,
  errorMessage: string
): AuthResponse => {
  if (response.status && response.token && response.user) {
    return {
      token: response.token,
      user: response.user,
    };
  }
  throw new Error(response.message || errorMessage);
};

// ======================= API METHODS =======================

const authApi = {
  /**
   * Đăng nhập thông thường
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        data
      );
      return validateAuthResponse(response as unknown as ApiResponse<AuthResponse>, "Đăng nhập thất bại");
    } catch (error) {
      throw handleApiError(error, "Đăng nhập thất bại");
    }
  },

  /**
   * Đăng ký thông thường
   */
  async register(data: RegisterData): Promise<{ message: string }> {
    try {
      const response = await axiosClient.post<ApiResponse<any>>(
        "/auth/register",
        data
      ) as unknown as ApiResponse<any>;
      
      if (response.status) {
        return { message: response.message };
      }
      throw new Error(response.message || "Đăng ký thất bại");
    } catch (error) {
      throw handleApiError(error, "Đăng ký thất bại");
    }
  },

  /**
   * Đăng xuất
   */
  async logout(): Promise<void> {
    try {
      await axiosClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    }
  },

  /**
   * Lấy thông tin user hiện tại
   */
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const response = await axiosClient.get<ApiResponse<AuthUser>>("/auth/me") as unknown as ApiResponse<AuthUser>;

      if (response.status && response.user) {
        return response.user;
      }

      throw new Error("Không thể lấy thông tin user");
    } catch (error) {
      throw handleApiError(error, "Không thể lấy thông tin user");
    }
  },

  /**
   * Quên mật khẩu
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await axiosClient.post<ApiResponse<any>>(
        "/forgot-password",
        { email }
      ) as unknown as ApiResponse<any>;
      return { message: response.message };
    } catch (error) {
      throw handleApiError(error, "Không thể gửi email reset password");
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
      const response = await axiosClient.post<ApiResponse<any>>("/reset-password", {
        token,
        password,
        password_confirmation: password,
      }) as unknown as ApiResponse<any>;
      return { message: response.message };
    } catch (error) {
      throw handleApiError(error, "Không thể reset password");
    }
  },

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const response = await axiosClient.post<ApiResponse<AuthResponse>>("/refresh");
      return validateAuthResponse(response as unknown as ApiResponse<AuthResponse>, "Refresh token thất bại");
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
      const response = await axiosClient.put<ApiResponse<AuthUser>>("/profile", data) as unknown as ApiResponse<AuthUser>;
      if (response.status && response.user) {
        return response.user;
      }
      throw new Error("Không thể cập nhật thông tin");
    } catch (error) {
      throw handleApiError(error, "Không thể cập nhật thông tin");
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
      const response = await axiosClient.put<ApiResponse<any>>("/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      }) as unknown as ApiResponse<any>;
      return { message: response.message };
    } catch (error) {
      throw handleApiError(error, "Không thể đổi mật khẩu");
    }
  },
};

// ======================= GOOGLE AUTH API =======================

export const googleAuthApi = {
  /**
   * Đăng nhập bằng Google
   */
  async login(credential: string): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<ApiResponse<AuthResponse>>(
        "/auth/googleLogin",
        { token: credential }
      );
      return validateAuthResponse(response as unknown as ApiResponse<AuthResponse>, "Đăng nhập Googsle thất bại");
    } catch (error) {
      throw handleApiError(error, "Đăng nhập Goosgle thất bại");
    }
  },

  /**
   * Đăng ký bằng Google
   */
  async register(credential: string): Promise<{ message: string }> {
    try {
      const response = await axiosClient.post<ApiResponse<any>>(
        "/auth/googleRegister",
        { token: credential }
      ) as unknown as ApiResponse<any>;
      
      if (response.status) {
        return { message: response.message };
      }
      throw new Error(response.message || "Đăng ký Google thất bại");
    } catch (error) {
      throw handleApiError(error, "Đăng ký Google thất bại");
    }
  },
};

export default authApi;