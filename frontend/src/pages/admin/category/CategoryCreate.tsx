import React from "react";
import { Form, Input, Button, Card, message } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CategoryCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const handleSubmit = (values: any) => {
    axios
      .post("http://127.0.0.1:8000/api/admin/categories", values, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        message.success("✅ Thêm danh mục thành công!");
        navigate("/admin/categories");
      })
      .catch((err) => {
        console.error("❌ Lỗi khi thêm danh mục:", err);
        message.error("Thêm danh mục thất bại!");
      });
  };

  return (
    <div style={{ padding: 20 }}>
      <Card title="Thêm danh mục mới" style={{ maxWidth: 600, margin: "0 auto" }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên danh mục!" }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={4} placeholder="Mô tả (tùy chọn)" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Lưu danh mục
            </Button>
            <Button style={{ marginLeft: 10 }} onClick={() => navigate(-1)}>
              Hủy
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CategoryCreate;
