import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Upload,
  Typography,
  Space,
  message,
  Alert,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { InboxOutlined } from "@ant-design/icons";
import { getCategories, createProduct } from "../../../services/productService";

const { TextArea } = Input;
const { Dragger } = Upload;
const { Title } = Typography;

interface Category { id: number; name: string }

const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Load categories
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getCategories();
        const cats: Category[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (mounted) setCategories(cats || []);
      } catch (e: any) {
        console.error(e);
        setFatalError(e?.message || "Không tải được danh mục");
        message.error(e?.message || "Không tải được danh mục");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Upload handlers
  const beforeUpload = () => false; // không auto upload; submit form mới upload
  const onChange = ({ fileList: newList }: { fileList: UploadFile[] }) => setFileList(newList);

  // Submit
  const onFinish = async (values: any) => {
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", values.name);
      fd.append("category_id", String(values.category_id));
      if (values.description) fd.append("description", values.description);
      if (values.origin) fd.append("origin", values.origin);
      if (values.brand) fd.append("brand", values.brand);
      if (values.price !== undefined) fd.append("price", String(values.price));
      if (values.discount_price !== undefined && values.discount_price !== null)
        fd.append("discount_price", String(values.discount_price));
      if (values.stock_quantity !== undefined)
        fd.append("stock_quantity", String(values.stock_quantity));
      if (values.variation_status !== undefined)
        fd.append("variation_status", String(values.variation_status ? 1 : 0));

      // Ảnh mới
      fileList.forEach((f) => {
        if (f.originFileObj) fd.append("images[]", f.originFileObj as File);
      });

      await createProduct(fd);
      message.success("Tạo sản phẩm thành công");
      navigate("/admin/products");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Tạo sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading} title={<Title level={4}>Thêm sản phẩm</Title>}>
      {fatalError && (
        <Alert style={{ marginBottom: 16 }} type="error" showIcon message={fatalError} />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true, message: "Nhập tên sản phẩm" }]}
        >
          <Input placeholder="VD: Áo thun unisex" />
        </Form.Item>

        <Form.Item
          label="Danh mục"
          name="category_id"
          rules={[{ required: true, message: "Chọn danh mục" }]}
        >
          <Select
            placeholder="Chọn danh mục"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <TextArea rows={4} placeholder="Mô tả ngắn gọn..." />
        </Form.Item>

        <Space
          size="large"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Form.Item
            label="Giá bán"
            name="price"
            rules={[{ required: true, message: "Nhập giá" }]}
          >
            <InputNumber min={0} step={1000} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Giá khuyến mãi"
            name="discount_price"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, v) {
                  const base = Number(getFieldValue("price"));
                  if (v == null || v === "" || Number(v) <= base) return Promise.resolve();
                  return Promise.reject(new Error("Giá khuyến mãi phải ≤ Giá bán"));
                },
              }),
            ]}
          >
            <InputNumber min={0} step={1000} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Tồn kho"
            name="stock_quantity"
            rules={[{ required: true, message: "Nhập tồn kho" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Biến thể" name="variation_status" initialValue={0}>
            <Select options={[{ value: 0, label: "Không" }, { value: 1, label: "Có" }]} />
          </Form.Item>
        </Space>

        <Space
          size="large"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <Form.Item label="Thương hiệu" name="brand">
            <Input placeholder="VD: ACME" />
          </Form.Item>
          <Form.Item label="Xuất xứ" name="origin">
            <Input placeholder="VD: Việt Nam" />
          </Form.Item>
        </Space>

        <Form.Item label="Hình ảnh">
          <Dragger
            multiple
            listType="picture-card"
            fileList={fileList}
            beforeUpload={beforeUpload}
            onChange={onChange}
            accept=".jpg,.jpeg,.png,.webp,.avif"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Kéo thả ảnh hoặc bấm để chọn</p>
            <p className="ant-upload-hint">Ảnh sẽ được tải lên khi bấm Lưu</p>
          </Dragger>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProductAdd;
