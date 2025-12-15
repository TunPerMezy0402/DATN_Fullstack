import axios from "axios";

// ================== TYPES ==================
export interface IBanner {
  id: number;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  images?: IBannerImage[];
}

export interface IBannerImage {
  id: number;
  banner_id: number;
  image_url: string;
}

export interface IPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ================== CONFIG ==================
const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/admin",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔑 Hàm tiện ích lấy token
const getAuthToken = (): string | null => {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    null
  );
};

// 🔒 Tự động thêm token vào mỗi request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================== SERVICES ==================
export const getAllBanners = async (
  page: number = 1,
  perPage: number = 10
): Promise<IPaginatedResponse<IBanner>> => {
  const res = await axiosInstance.get(
    `/banners?page=${page}&per_page=${perPage}`
  );
  return res.data;
};

export const getBannerById = async (id: number): Promise<IBanner> => {
  const res = await axiosInstance.get(`/banners/${id}`);
  return res.data;
};

export const createBanner = async (data: {
  title: string;
  is_active?: boolean;
}): Promise<IBanner> => {
  const res = await axiosInstance.post("/banners", data);
  return res.data;
};

export const updateBanner = async (
  id: number,
  data: Partial<IBanner>
): Promise<IBanner> => {
  const res = await axiosInstance.put(`/banners/${id}`, data);
  return res.data;
};

export const deleteBanner = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/banners/${id}`);
};
