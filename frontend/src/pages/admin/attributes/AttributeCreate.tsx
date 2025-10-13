import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
} from "antd";
import { SaveOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Title } = Typography;

const AttributeCreate: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        message.error("Không tìm thấy token trong localStorage!");
        return;
      }

      await axios.post(
        "http://127.0.0.1:8000/api/admin/attributes",
        {
          type: values.type,
          value: values.value,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      message.success("Thêm thuộc tính thành công!");
      navigate("/admin/attributes");
    } catch (error: any) {
      console.error("❌ Lỗi khi thêm thuộc tính:", error);
      message.error(
        error?.response?.data?.message || "Không thể thêm thuộc tính!"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card
        bordered={false}
        className="shadow-md rounded-2xl bg-white max-w-2xl mx-auto"
      >
        {/* Tiêu đề */}
        <div className="flex items-center justify-between mb-4">
          <Title level={4} style={{ margin: 0 }}>
            ➕ Thêm thuộc tính mới
          </Title>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/admin/attributes")}
          >
            Quay lại
          </Button>
        </div>

        {/* Form nhập liệu */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: "", value: "" }}
        >
          <Form.Item
            label="Loại thuộc tính"
            name="type"
            rules={[
              { required: true, message: "Vui lòng nhập loại thuộc tính!" },
            ]}
          >
            <Input placeholder="Ví dụ: màu sắc, kích thước, chất liệu..." />
          </Form.Item>

          <Form.Item
            label="Giá trị"
            name="value"
            rules={[{ required: true, message: "Vui lòng nhập giá trị!" }]}
          >
            <Input placeholder="Ví dụ: Đỏ, XL, Gỗ..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
              >
                Lưu thuộc tính
              </Button>
              <Button onClick={() => form.resetFields()}>Làm mới</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AttributeCreate;
