import React, { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  description: string;
  deleted_at: string | null; // datetime hoặc null
}

const CategoryTrash: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const navigate = useNavigate();

  /** 📦 Lấy danh sách danh mục đã xóa mềm */
  const fetchTrashed = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/categories/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Lấy mảng data thật
      const data = res.data?.data?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách danh mục đã xóa mềm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashed();
  }, []);

  /** ♻️ Khôi phục */
  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${API_URL}/admin/categories/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("✅ Khôi phục danh mục thành công!");
      // Xóa item khỏi bảng frontend ngay sau khi khôi phục
      setCategories(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      message.error("Không thể khôi phục danh mục!");
    }
  };

  /** 🚮 Xóa vĩnh viễn */
  const handleForceDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/categories/${id}/force-delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("🗑️ Đã xóa vĩnh viễn danh mục!");
      // Xóa item khỏi bảng frontend ngay sau khi xóa
      setCategories(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa vĩnh viễn!");
    }
  };

  /** 🧱 Cột của bảng */
  const columns = [
    { title: "Tên danh mục", dataIndex: "name" },
    { title: "Mô tả", dataIndex: "description" },
    {
      title: "Ngày xóa",
      dataIndex: "deleted_at",
      render: (text: string | null) =>
        text ? dayjs(text).format("HH:mm - DD/MM/YYYY") : "—",
    },
    {
      title: "Hành động",
      render: (_: any, record: Category) => (
        <Space>
          <Button type="link" onClick={() => handleRestore(record.id)}>
            ♻️ Khôi phục
          </Button>
          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleForceDelete(record.id)}
          >
            <Button danger type="link">
              🚮 Xóa vĩnh viễn
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h2>🗑️ Danh mục đã xóa mềm</h2>
        <Button onClick={() => navigate("/admin/categories")}>⬅️ Quay lại danh sách</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={categories}
        loading={loading}
        bordered
      />
    </div>
  );
};

export default CategoryTrash;
