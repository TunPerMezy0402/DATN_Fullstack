import React, { useEffect, useState } from "react";
import { Form, Input, Switch, Button, message } from "antd";
import { getBannerById, updateBanner } from "../../../api/bannerApi";
import { useNavigate, useParams } from "react-router-dom";

const BannerEdit: React.FC = () => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      getBannerById(Number(id)).then((data) => {
        form.setFieldsValue(data);
      });
    }
  }, [id]);

  const onFinish = async (values: any) => {
    try {
      await updateBanner(Number(id), values);
      message.success("Cập nhật banner thành công!");
      navigate("/admin/banners");
    } catch {
      message.error("Không thể cập nhật banner!");
    }
  };

  return (
    <Form layout="vertical" form={form} onFinish={onFinish}>
      <Form.Item
        name="title"
        label="Tiêu đề"
        rules={[{ required: true, message: "Nhập tiêu đề!" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item name="is_active" label="Kích hoạt" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Button type="primary" htmlType="submit">
        Cập nhật
      </Button>
    </Form>
  );
};

export default BannerEdit;
