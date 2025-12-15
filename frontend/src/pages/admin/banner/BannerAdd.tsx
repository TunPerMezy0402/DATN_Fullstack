import React from "react";
import { Form, Input, Switch, Button, message } from "antd";
import { createBanner } from "../../../api/bannerApi";
import { useNavigate } from "react-router-dom";

const BannerAdd: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      await createBanner(values);
      message.success("Thêm banner thành công!");
      navigate("/admin/banners");
    } catch {
      message.error("Lỗi khi thêm banner!");
    }
  };

  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Form.Item
        name="title"
        label="Tiêu đề"
        rules={[{ required: true, message: "Nhập tiêu đề!" }]}
      >
        <Input placeholder="Nhập tiêu đề banner..." />
      </Form.Item>

      <Form.Item name="is_active" label="Kích hoạt" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Button type="primary" htmlType="submit">
        Lưu
      </Button>
    </Form>
  );
};

export default BannerAdd;
