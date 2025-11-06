import axios from "axios";

// ================== TYPES ==================
export interface IBanner {
  id: number;
  title: string;
  is_active: boolean;
  link?: string | null;
  images: IBannerImage[];
  created_at: string;
  updated_at: string;
}

export interface IBannerImage {
  id: number;
  banner_id: number;
  image: string;
  image_url: string;
  is_active: boolean;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ================== CONFIG ==================
const axiosInstance = axios.create({
  baseURL: "http://localhost:8000/api/admin",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ================== SERVICES ==================
export const getAllBanners = async (
  page: number = 1,
  perPage: number = 10
): Promise<IPaginatedResponse<IBanner>> => {
  const res = await axiosInstance.get(`/banners?page=${page}&per_page=${perPage}`);
  return res.data; // ✅ pagination của Laravel Resource đúng format này
};

export const getBannerById = async (id: number): Promise<IBanner> => {
  const res = await axiosInstance.get(`/banners/${id}`);
  return res.data.data; // ✅ phải lấy res.data.data
};

export const createBanner = async (data: {
  title: string;
  is_active?: boolean;
  link?: string;
}): Promise<IBanner> => {
  const res = await axiosInstance.post("/banners", data);
  return res.data.data;
};

export const updateBanner = async (
  id: number,
  data: Partial<IBanner>
): Promise<IBanner> => {
  const res = await axiosInstance.put(`/banners/${id}`, data);
  return res.data.data;
};

export const deleteBanner = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/banners/${id}`);
};
