import React, { useEffect, useState } from "react";
import { Card, Spin, Button, Descriptions, message } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!id) return;

    axios
      .get(`http://127.0.0.1:8000/api/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const data = res.data.data || res.data;
        setCategory(data);
      })
      .catch((err) => {
        console.error("❌ Lỗi tải danh mục:", err);
        message.error("Không thể tải thông tin danh mục");
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <Spin style={{ marginTop: 100, display: "block" }} />;

  if (!category) return <p>Không tìm thấy danh mục</p>;

  return (
    <div style={{ padding: 20 }}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Quay lại
      </Button>

      <Card title={`Chi tiết danh mục #${category.id}`}>
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Tên danh mục">{category.name}</Descriptions.Item>
          <Descriptions.Item label="Mô tả">{category.description || "Không có mô tả"}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {dayjs(category.created_at).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật gần nhất">
            {dayjs(category.updated_at).format("HH:mm - DD/MM/YYYY")}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default CategoryDetail;
