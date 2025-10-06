import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // 👈 sửa nếu backend khác
  headers: {
    "Content-Type": "application/json",
  },
});

// Gắn token vào mọi request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi (401 → logout)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
