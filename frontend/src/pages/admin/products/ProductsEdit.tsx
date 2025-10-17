import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { getProduct, updateProduct, getCategories } from "../../../services/productService";

const { TextArea } = Input;
const { Dragger } = Upload;
const { Title, Text } = Typography;

// Đồng bộ với ProductsList
const FILE_BASE_URL = "http://localhost:3000/storage/";

interface Category { id: number; name: string }
interface Product {
  id: number;
  name: string;
  category_id: number;
  description?: string | null;
  origin?: string | null;
  brand?: string | null;
  price: number | string | null;
  discount_price?: number | string | null;
  stock_quantity: number;
  variation_status?: number | boolean;
  images?: string[] | string | null;
}

// Chuẩn hoá mảng ảnh về string[]
const toImageArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(val).split(",").map(s => s.trim()).filter(Boolean);
  }
};

// Build URL ảnh đầy đủ
const getThumbUrl = (path?: string) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return FILE_BASE_URL + path.replace(/^\/+/, "");
};

const ProductsEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedExisting, setRemovedExisting] = useState<Set<string>>(new Set());

  // Load categories + product
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!id) throw new Error("Thiếu id sản phẩm trong URL");
        setLoading(true);

        // getCategories() trả mảng thuần; getProduct() trả AxiosResponse
        const [cats, prodRes] = await Promise.all([
          getCategories(),                 // Category[]
          getProduct(Number(id)),          // AxiosResponse
        ]);

        if (!mounted) return;

        setCategories(cats || []);

        // Bóc dữ liệu sản phẩm từ AxiosResponse
        const payload = prodRes.data;
        const raw: any = payload?.data ?? payload; // hỗ trợ cả {status,data} hoặc object thuần
        if (!raw || !raw.id) {
          setFatalError("Không tìm thấy dữ liệu sản phẩm.");
          return;
        }

        const prod: Product = { ...raw, images: toImageArray(raw.images) };

        setProduct(prod);
        setExistingImages((prod.images as string[]) || []);

        // Map images -> UploadFile preview
        const files: UploadFile[] = ((prod.images as string[]) || []).map((p, idx) => ({
          uid: `existing-${idx}`,
          name: (p && p.split("/").pop()) || `image-${idx}`,
          status: "done",
          url: getThumbUrl(p),
        }));
        setFileList(files);

        // Init form values
        form.setFieldsValue({
          name: prod.name,
          category_id: prod.category_id,
          description: prod.description ?? undefined,
          origin: prod.origin ?? undefined,
          brand: prod.brand ?? undefined,
          price: prod.price != null ? Number(prod.price) : undefined,
          discount_price: prod.discount_price != null ? Number(prod.discount_price) : undefined,
          stock_quantity: Number(prod.stock_quantity) ?? 0,
          variation_status: prod.variation_status ? 1 : 0,
        });
      } catch (e: any) {
        console.error(e);
        setFatalError(e?.message || "Không tải được dữ liệu");
        message.error(e?.message || "Không tải được dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upload handlers
  const beforeUpload = () => false; // không auto upload, gom khi submit

  const onChange = ({ fileList: newList }: { fileList: UploadFile[] }) => {
    setFileList(newList);
  };

  const onRemove = (file: UploadFile) => {
    // Nếu là ảnh cũ (đã done và có url trùng)
    const existed = existingImages.find((p) => getThumbUrl(p) === file.url);
    if (existed) {
      setRemovedExisting((prev) => {
        const next = new Set(prev);
        next.add(existed);
        return next;
      });
    }
    return true; // cho phép xoá trên UI
  };

  // Submit
  const onFinish = async (values: any) => {
    try {
      if (!id) throw new Error("Thiếu id sản phẩm");
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

      // Ảnh cũ cần xoá
      Array.from(removedExisting).forEach((p) => fd.append("remove_images[]", p));

      // Ảnh mới
      fileList.forEach((f) => {
        if (f.originFileObj) {
          fd.append("images[]", f.originFileObj as File);
        }
      });

      // Laravel update bằng POST + _method=PUT để giữ multipart
      fd.append("_method", "PUT");
      await updateProduct(Number(id), fd);

      message.success("Cập nhật sản phẩm thành công");
      navigate("/admin/products");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card loading={loading} title={<Title level={4}>Sửa sản phẩm</Title>}>
      {fatalError && (
        <Alert style={{ marginBottom: 16 }} type="error" showIcon message={fatalError} />
      )}
      {!loading && !fatalError && !product && (
        <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="Không có dữ liệu để hiển thị." />
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
            loading={loading}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <TextArea rows={4} placeholder="Mô tả ngắn gọn..." />
        </Form.Item>

        <Space size="large" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item label="Giá bán" name="price" rules={[{ required: true, message: "Nhập giá" }]}>
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

          <Form.Item label="Biến thể" name="variation_status">
            <Select options={[{ value: 0, label: "Không" }, { value: 1, label: "Có" }]} />
          </Form.Item>
        </Space>

        <Space size="large" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
            onRemove={onRemove}
            accept=".jpg,.jpeg,.png,.webp,.avif"
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Kéo thả ảnh hoặc bấm để chọn</p>
            <p className="ant-upload-hint">Ảnh mới sẽ được tải lên khi bấm Lưu</p>
          </Dragger>
          {removedExisting.size > 0 && (
            <Text type="secondary">Sẽ xoá {removedExisting.size} ảnh cũ khi lưu.</Text>
          )}
        </Form.Item>

        <Form.Item>
          <Space>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu thay đổi
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ProductsEdit;
