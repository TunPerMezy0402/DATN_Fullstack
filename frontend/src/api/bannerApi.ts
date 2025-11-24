import axios, { AxiosError } from "axios";

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

// ================== INTERCEPTOR ==================
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    console.warn("Chưa có token! Vui lòng login.");
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error("401: Token hết hạn hoặc không hợp lệ!");
      localStorage.removeItem("access_token");
      // window.location.href = "/login"; // Tùy chọn: redirect login
    }
    return Promise.reject(error);
  }
);

// ================== SERVICES ==================
export const getAllBanners = async (
  page: number = 1,
  perPage: number = 10
): Promise<IPaginatedResponse<IBanner>> => {
  const res = await axiosInstance.get(`/banners?page=${page}&per_page=${perPage}`);
  return res.data;
};

export const getBannerById = async (id: number): Promise<IBanner> => {
  const res = await axiosInstance.get(`/banners/${id}`);
  return res.data.data;
};

// CREATE BANNER – DÙNG AXIOS + FORM DATA
export const createBanner = async (payload: any): Promise<IBanner> => {
  const formData = new FormData();

  // Text fields
  formData.append("title", payload.title);
  if (payload.link) formData.append("link", payload.link);
  formData.append("is_active", payload.is_active ? "1" : "0");

  // Images – DÙNG DẤU NGOẶC VUÔNG [] ĐÚNG CÚ PHÁP PHP
  payload.images.forEach((img: any, index: number) => {
    if (img.file && img.file instanceof File) {
      formData.append(`images[${index}][file]`, img.file);
    } else if (img.url) {
      formData.append(`images[${index}][url]`, img.url); // ← SỬA: [] thay vì .
    }
    formData.append(`images[${index}][is_active]`, img.is_active ? "1" : "0");
  });

  try {
    const res = await axiosInstance.post("/banners", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data.data || res.data;
  } catch (error: any) {
    const errors = error.response?.data?.errors || {};
    const messages = Object.values(errors).flat().join(", ");
    throw new Error(messages || "Tạo banner thất bại");
  }
};

// UPDATE BANNER – DÙNG AXIOS
export const updateBanner = async (
  id: number,
  data: Partial<IBanner>
): Promise<IBanner> => {
  const res = await axiosInstance.put(`/banners/${id}`, data);
  return res.data.data || res.data;
};

// DELETE BANNER
export const deleteBanner = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/banners/${id}`);
};