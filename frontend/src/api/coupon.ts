import axios from 'axios';

export type DiscountType = 'percent' | 'fixed';

export interface Coupon {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase?: number | null;
  max_discount?: number | null;
  start_date?: string | null;   // ISO datetime string
  end_date?: string | null;     // ISO datetime string
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/**
 * ================================
 * ⚙️ 2. API service cho Coupon
 * ================================
 */

const API_URL = '/api/admin/coupons';

export const CouponService = {
  /**
   * Lấy danh sách tất cả coupon
   * @param params Tùy chọn bộ lọc (search, is_active, v.v.)
   */
  async getAll(params?: Record<string, any>) {
    const res = await axios.get(API_URL, { params });
    return res.data;
  },

  /**
   * Lấy danh sách các coupon đã xóa mềm
   */
  async getTrash() {
    const res = await axios.get(`${API_URL}/trash`);
    return res.data;
  },

  /**
   * Lấy chi tiết coupon theo ID
   */
  async getById(id: number) {
    const res = await axios.get(`${API_URL}/${id}`);
    return res.data;
  },

  /**
   * Tạo mới coupon
   */
  async create(data: Partial<Coupon>) {
    const res = await axios.post(API_URL, data);
    return res.data;
  },

  /**
   * Cập nhật coupon
   */
  async update(id: number, data: Partial<Coupon>) {
    const res = await axios.put(`${API_URL}/${id}`, data);
    return res.data;
  },

  /**
   * Xóa mềm coupon
   */
  async softDelete(id: number) {
    const res = await axios.delete(`${API_URL}/${id}`);
    return res.data;
  },

  /**
   * Phục hồi coupon đã xóa mềm
   */
  async restore(id: number) {
    const res = await axios.post(`${API_URL}/${id}/restore`);
    return res.data;
  },

  /**
   * Xóa vĩnh viễn coupon khỏi CSDL
   */
  async forceDelete(id: number) {
    const res = await axios.delete(`${API_URL}/${id}/force-delete`);
    return res.data;
  },
};