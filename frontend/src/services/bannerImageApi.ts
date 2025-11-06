import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/admin/banners";

export const getBannerImages = async () => {
  const res = await axios.get(API_URL);
  return res.data.data || [];
};

export const getTrashedBannerImages = async () => {
  const res = await axios.get(`${API_URL}/trash`);
  return res.data.data || [];
};

export const createBannerImage = async (bannerId: number, formData: FormData) => {
  const res = await axios.post(`${API_URL}/${bannerId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateBannerImage = async (id: number, formData: FormData) => {
  const res = await axios.post(`${API_URL}/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteBannerImage = async (id: number) => {
  await axios.delete(`${API_URL}/${id}`);
};

export const restoreBannerImage = async (id: number) => {
  const res = await axios.post(`${API_URL}/restore/${id}`);
  return res.data;
};

export const forceDeleteBannerImage = async (id: number) => {
  await axios.delete(`${API_URL}/force-delete/${id}`);
};
