import axios, { AxiosInstance, AxiosError } from 'axios';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// ======================= AXIOS INSTANCE =======================

const axiosClient: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ======================= REQUEST INTERCEPTOR =======================

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ======================= RESPONSE INTERCEPTOR =======================

axiosClient.interceptors.response.use(
  (response) => {
    return response.data || response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Nếu lỗi 401 và chưa retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Thử refresh token
        const response = await axios.post(`${BACKEND_URL}/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        const newToken = response.data?.token;
        if (newToken) {
          localStorage.setItem('auth_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh thất bại, clear auth và redirect
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;