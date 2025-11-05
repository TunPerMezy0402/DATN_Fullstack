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
const API_URL = "http://localhost:8000/api/admin/banners";

// ================== SERVICES ==================
export const getAllBanners = async (
  page: number = 1,
  perPage: number = 10
): Promise<IPaginatedResponse<IBanner>> => {
  const res = await axios.get(`${API_URL}?page=${page}&per_page=${perPage}`);
  return res.data;
};

export const getBannerById = async (id: number): Promise<IBanner> => {
  const res = await axios.get(`${API_URL}/${id}`);
  return res.data;
};

export const createBanner = async (data: {
  title: string;
  is_active?: boolean;
}): Promise<IBanner> => {
  const res = await axios.post(API_URL, data);
  return res.data;
};

export const updateBanner = async (
  id: number,
  data: Partial<IBanner>
): Promise<IBanner> => {
  const res = await axios.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const deleteBanner = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};
