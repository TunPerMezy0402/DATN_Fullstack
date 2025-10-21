// src/pages/admin/products/ProductCreate.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

/* ============================== Types ============================== */
type Category = { id: number; name: string };
type Attribute = { id: number; type: "size" | "color" | string; value: string };

type VariantForm = {
  size_id: number | null;
  color_id: number | null;
  sku: string;           // auto random 9 ký tự
  price: string;         // UI lưu raw string
  discount_price: string;
  stock_quantity: number;
  is_available: boolean;

  // UI-only (file)
  mainFiles: UploadFile[];   // ảnh đại diện biến thể (1 file)
  albumFiles: UploadFile[];  // album (nhiều file)
};

/* ============================== Axios ============================== */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const raw = axios.create({ baseURL: API_URL, timeout: 20000 });
raw.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) (config.headers as any) = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
  return config;
});

/* ============================== Helpers ============================== */
const toNumberOrUndef = (v: unknown) =>
  typeof v === "number"
    ? v
    : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
    ? Number(v)
    : undefined;

/** SKU random 9 ký tự (A–Z, 0–9) */
const generateSku = (len = 9) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint32Array(len);
  (crypto as any)?.getRandomValues?.(arr);
  return Array.from({ length: len }, (_, i) => chars[(arr[i] ?? Math.floor(Math.random() * 1e9)) % chars.length]).join(
    ""
  );
};

/** Không cho copy/sửa SKU */
const noCopyProps = {
  readOnly: true,
  disabled: true,
  onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => e.preventDefault(),
  style: { userSelect: "none" as const },
};

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
  });

/** Chặn antd upload tự động; validate cơ bản */
const blockAutoUpload = (file: RcFile) => {
  if (!file.type.startsWith("image/")) {
    message.error("Chỉ chấp nhận file ảnh");
    return Upload.LIST_IGNORE;
  }
  if (file.size / 1024 / 1024 >= 8) {
    message.error("Ảnh phải nhỏ hơn 8MB");
    return Upload.LIST_IGNORE;
  }
  return false; // ❗️chặn upload tự động, chỉ add vào fileList
};

/** Danh mục là required (chấp nhận 0) */
const requiredCategory = (_: any, value: any) => {
  if (value === 0 || (value !== undefined && value !== null)) return Promise.resolve();
  return Promise.reject(new Error("Chọn danh mục"));
};

/** Parse tiền về number | null */
function parseMoneyNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Tiền -> string|null (API cần string|null) */
function moneyToApiString(input: string | number | null | undefined): string | null {
  const n = parseMoneyNumber(input);
  return n === null ? null : String(n);
}

/** Validate biến thể */
function validateVariantsOrToast(variants: VariantForm[]) {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const price = parseMoneyNumber(v.price);
    const discount = parseMoneyNumber(v.discount_price);

    if (price === null) {
      message.error(`Biến thể #${i + 1}: Vui lòng nhập Giá hợp lệ`);
      return false;
    }
    if (discount !== null && discount > price) {
      message.error(`Biến thể #${i + 1}: Giá khuyến mãi không được cao hơn giá gốc`);
      return false;
    }
  }
  return true;
}

/* ============================== Component ============================== */
export default function ProductCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // UI state
  const [saving, setSaving] = useState(false);
  const [variationEnabled, setVariationEnabled] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Attributes
  const [sizes, setSizes] = useState<Attribute[]>([]);
  const [colors, setColors] = useState<Attribute[]>([]);

  // Modals (create nhanh)
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [attrModalOpen, setAttrModalOpen] = useState<null | "size" | "color">(null);
  const [attrValue, setAttrValue] = useState("");

  // Product cover (CHỈ 1 ảnh)
  const [productFile, setProductFile] = useState<UploadFile[]>([]); // maxCount=1

  // Variants
  const [variants, setVariants] = useState<VariantForm[]>([]);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("Ảnh xem trước");

  /* -------- Load categories + attributes -------- */
  useEffect(() => {
    (async () => {
      try {
        const catRes = await raw.get("/admin/categories", { params: { per_page: 1000 } });
        const cats: Category[] = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.data?.data || catRes.data?.data || [];

        setCategories(cats.map((c: any) => ({ id: Number(c.id), name: c.name })));

        const [sz, cl] = await Promise.all([
          raw.get("/admin/attributes", { params: { type: "size", per_page: 1000 } }),
          raw.get("/admin/attributes", { params: { type: "color", per_page: 1000 } }),
        ]);

        const sizesList: Attribute[] = Array.isArray(sz.data)
          ? sz.data
          : sz.data?.data?.data || sz.data?.data || [];
        const colorsList: Attribute[] = Array.isArray(cl.data)
          ? cl.data
          : cl.data?.data?.data || cl.data?.data || [];

        setSizes(sizesList);
        setColors(colorsList);
      } catch (e: any) {
        console.error(e);
        message.error(e?.response?.data?.message || "Không tải được danh mục/thuộc tính");
      }
    })();
  }, []);

  /* -------- Seed SKU sản phẩm -------- */
  useEffect(() => {
    const current = form.getFieldValue("sku");
    if (!current) form.setFieldValue("sku", generateSku(9));
  }, [form]);

  /* -------- Options -------- */
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: Number(c.id) })),
    [categories]
  );
  const sizeOptions = useMemo(() => sizes.map((s) => ({ label: s.value, value: s.id })), [sizes]);
  const colorOptions = useMemo(() => colors.map((c) => ({ label: c.value, value: c.id })), [colors]);

  /* =================== Variant handlers =================== */
  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      {
        size_id: null,
        color_id: null,
        sku: generateSku(9),
        price: "",
        discount_price: "",
        stock_quantity: 0,
        is_available: true,
        mainFiles: [],
        albumFiles: [],
      },
    ]);

  const removeVariant = (idx: number) => setVariants((prev) => prev.filter((_, i) => i !== idx));

  const setVariant = <K extends keyof VariantForm>(idx: number, key: K, value: VariantForm[K]) =>
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });

  /* =================== Upload handlers =================== */
  // Product cover: CHỈ 1 ảnh
  const onChangeProductFile = ({ fileList }: { fileList: UploadFile[] }) => {
    setProductFile(fileList.slice(-1)); // giữ đúng 1 ảnh
  };

  // Biến thể - ảnh chính
  const onChangeVariantMain = (idx: number, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].mainFiles = fileList.slice(-1); // 1 file
      return next;
    });
  };

  // Biến thể - album
  const onChangeVariantAlbum = (idx: number, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].albumFiles = fileList;
      return next;
    });
  };

  /* =================== Preview =================== */
  const onPreviewFile = async (file: UploadFile) => {
    let src = file.url as string | undefined;
    if (!src && file.originFileObj) src = await getBase64(file.originFileObj as File);
    if (!src && file.thumbUrl) src = file.thumbUrl as string;
    setPreviewSrc(src || "");
    setPreviewTitle(file.name || "Ảnh xem trước");
    setPreviewOpen(true);
  };

  /* =================== Submit (multipart/form-data) =================== */
  const onFinish = async (values: any) => {
    try {
      setSaving(true);

      if (variationEnabled && !validateVariantsOrToast(variants)) {
        setSaving(false);
        return;
      }

      const normalizedSku =
        (values.sku && String(values.sku).replace(/\s+/g, "").toUpperCase()) || generateSku(9);
      const normalizedCategoryId = toNumberOrUndef(values.category_id) ?? null;

      const fd = new FormData();
      fd.append("name", values.name);
      if (normalizedSku) fd.append("sku", normalizedSku);
      if (normalizedCategoryId !== null) fd.append("category_id", String(normalizedCategoryId));
      if (values.description) fd.append("description", values.description);
      if (values.origin) fd.append("origin", values.origin);
      if (values.brand) fd.append("brand", values.brand);
      fd.append("variation_status", variationEnabled ? "1" : "0");

      // Ảnh sản phẩm -> CHỈ 1 ảnh => gửi field 'image'
      const cover = productFile[0]?.originFileObj as RcFile | undefined;
      if (cover) {
        fd.append("image", cover);
      }

      // Biến thể
      if (variationEnabled) {
        variants.forEach((v, i) => {
          if (v.size_id !== null && v.size_id !== undefined) {
            fd.append(`variants[${i}][size_id]`, String(v.size_id));
          }
          if (v.color_id !== null && v.color_id !== undefined) {
            fd.append(`variants[${i}][color_id]`, String(v.color_id));
          }
          if (v.sku) fd.append(`variants[${i}][sku]`, String(v.sku));

          const price = moneyToApiString(v.price);
          const discount = moneyToApiString(v.discount_price);
          if (price !== null) fd.append(`variants[${i}][price]`, price);
          if (discount !== null) fd.append(`variants[${i}][discount_price]`, discount);

          fd.append(
            `variants[${i}][stock_quantity]`,
            String(Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0)
          );
          fd.append(`variants[${i}][is_available]`, v.is_available ? "1" : "0");

          // Ảnh chính biến thể (1 file) -> variants[i][image]
          const mainFile = v.mainFiles[0]?.originFileObj as RcFile | undefined;
          if (mainFile) {
            fd.append(`variants[${i}][image]`, mainFile);
          }

          // Album biến thể (nhiều file) -> variants[i][images][]
          v.albumFiles.forEach((af) => {
            const file = af.originFileObj as RcFile | undefined;
            if (file) fd.append(`variants[${i}][images][]`, file);
          });
        });
      }

      // POST multipart
      const res = await raw.post("/admin/products", fd, {
        headers: {
          // KHÔNG đặt Content-Type -> để axios tự set multipart boundary
        },
      });

      const product = res.data?.data ?? res.data;
      message.success("Tạo sản phẩm thành công");
      navigate(`/admin/products/${product?.id ?? ""}`);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Lỗi tạo sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  /* =================== Render =================== */
  return (
    <div className="p-4">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={3}>Thêm sản phẩm</Title>
        </Col>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            name: "",
            sku: "", // seed ở useEffect
            category_id: undefined,
            origin: "",
            brand: "",
            description: "",
          }}
        >
          {/* --- Basic info --- */}
          <Row gutter={[16, 16]} align="top">
            {/* Trái: Ảnh sản phẩm (CHỈ 1) */}
            <Col xs={24} md={8}>
              <Form.Item label="Ảnh sản phẩm (1 ảnh)">
                <Upload
                  accept="image/*"
                  listType="picture-card"
                  maxCount={1}
                  beforeUpload={blockAutoUpload}
                  fileList={productFile}
                  onChange={({ fileList }) => onChangeProductFile({ fileList: fileList as UploadFile[] })}
                  onPreview={onPreviewFile}
                  showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                  className="upload-cover pretty-upload"
                >
                  {(productFile.length || 0) >= 1 ? null : (
                    <div>
                      <UploadOutlined />
                      <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                    </div>
                  )}
                </Upload>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  Chỉ chọn 1 ảnh; tối đa 8MB. Ảnh sẽ được lưu vào <code>storage/img/product</code>.
                </div>
              </Form.Item>
            </Col>

            {/* Phải: Thông tin cơ bản */}
            <Col xs={24} md={16}>
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tên sản phẩm"
                    name="name"
                    rules={[{ required: true, message: "Bắt buộc" }]}
                  >
                    <Input placeholder="VD: Giày Jordan 1" allowClear />
                  </Form.Item>
                </Col>

                {/* SKU: auto random, không cho sửa/copy */}
                <Col xs={24} md={12}>
                  <Form.Item label="SKU (tự tạo)" name="sku" tooltip="Tự động 9 ký tự: A–Z, 0–9">
                    <Input {...noCopyProps} maxLength={9} placeholder="SKU tự động" />
                  </Form.Item>
                </Col>

                {/* Danh mục */}
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Danh mục"
                    name="category_id"
                    rules={[{ validator: requiredCategory }]}
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <Select
                        showSearch
                        allowClear
                        placeholder="Chọn danh mục"
                        optionFilterProp="label"
                        options={categoryOptions}
                        style={{ flex: 1 }}
                        onChange={(val) => {
                          const v = typeof val === "string" ? Number(val) : val;
                          form.setFieldValue("category_id", v);
                        }}
                      />
                      <Button onClick={() => setCatModalOpen(true)}>+ Thêm</Button>
                    </Space.Compact>
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item label="Xuất xứ" name="origin">
                    <Input placeholder="VD: USA" allowClear />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item label="Thương hiệu" name="brand">
                    <Input placeholder="VD: Nike" allowClear />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item label="Mô tả" name="description">
                    <Input.TextArea rows={4} placeholder="Mô tả ngắn" />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          {/* --- Variants --- */}
          <Divider plain orientation="left">Biến thể</Divider>
          <Space align="center" size="middle" style={{ marginBottom: 12 }}>
            <Text>Kích hoạt biến thể</Text>
            <Switch checked={variationEnabled} onChange={setVariationEnabled} />
          </Space>

          {variationEnabled ? (
            <div className="variant-list">
              {variants.map((v, idx) => (
                <Card key={idx} className="mb-3 rounded-xl shadow-xs" size="small">
                  <Row gutter={[16, 8]}>
                    {/* Ảnh đại diện biến thể */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Ảnh đại diện biến thể (1 ảnh)">
                        <Upload
                          accept="image/*"
                          listType="picture-card"
                          maxCount={1}
                          beforeUpload={blockAutoUpload}
                          fileList={variants[idx].mainFiles}
                          onChange={({ fileList }) => onChangeVariantMain(idx, fileList as UploadFile[])}
                          onPreview={onPreviewFile}
                          showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          className="upload-variant-main pretty-upload"
                        >
                          {(variants[idx].mainFiles?.length || 0) >= 1 ? null : (
                            <div>
                              <UploadOutlined />
                              <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                    </Col>

                    {/* Size */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Size">
                        <Space.Compact style={{ width: "100%" }}>
                          <Select
                            allowClear
                            showSearch
                            placeholder="Chọn size"
                            optionFilterProp="label"
                            options={sizeOptions}
                            value={v.size_id ?? undefined}
                            onChange={(val) => setVariant(idx, "size_id", val ?? null)}
                            style={{ flex: 1 }}
                          />
                          <Button onClick={() => setAttrModalOpen("size")}>+ Thêm</Button>
                        </Space.Compact>
                      </Form.Item>
                    </Col>

                    {/* Color */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Màu">
                        <Space.Compact style={{ width: "100%" }}>
                          <Select
                            allowClear
                            showSearch
                            placeholder="Chọn màu"
                            optionFilterProp="label"
                            options={colorOptions}
                            value={v.color_id ?? undefined}
                            onChange={(val) => setVariant(idx, "color_id", val ?? null)}
                            style={{ flex: 1 }}
                          />
                          <Button onClick={() => setAttrModalOpen("color")}>+ Thêm</Button>
                        </Space.Compact>
                      </Form.Item>
                    </Col>

                    {/* SKU biến thể */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="SKU biến thể">
                        <Input {...noCopyProps} maxLength={9} value={v.sku} />
                      </Form.Item>
                    </Col>

                    {/* Tồn kho */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Tồn kho">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={v.stock_quantity}
                          onChange={(val) => setVariant(idx, "stock_quantity", Number(val) || 0)}
                        />
                      </Form.Item>
                    </Col>

                    {/* Giá */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Giá">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={Number(v.price || 0)}
                          onChange={(val) =>
                            setVariant(idx, "price", val !== null && val !== undefined ? String(val) : "")
                          }
                        />
                      </Form.Item>
                    </Col>

                    {/* Giá KM */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Giá KM">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={Number(v.discount_price || 0)}
                          onChange={(val) =>
                            setVariant(
                              idx,
                              "discount_price",
                              val !== null && val !== undefined ? String(val) : ""
                            )
                          }
                        />
                      </Form.Item>
                    </Col>

                    {/* Trạng thái */}
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Trạng thái">
                        <Switch
                          checked={v.is_available}
                          onChange={(val) => setVariant(idx, "is_available", val)}
                        />
                      </Form.Item>
                    </Col>

                    {/* Album ảnh phụ */}
                    <Col span={24}>
                      <Form.Item label="Ảnh phụ của biến thể (nhiều ảnh)">
                        <Upload
                          accept="image/*"
                          listType="picture-card"
                          multiple
                          beforeUpload={blockAutoUpload}
                          fileList={variants[idx].albumFiles}
                          onChange={({ fileList }) => onChangeVariantAlbum(idx, fileList as UploadFile[])}
                          onPreview={onPreviewFile}
                          showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          className="upload-variant-album pretty-upload"
                        >
                          <div>
                            <UploadOutlined />
                            <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                          </div>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Space>
                    <Button danger icon={<DeleteOutlined />} onClick={() => removeVariant(idx)}>
                      Xoá biến thể
                    </Button>
                  </Space>
                </Card>
              ))}

              <Button icon={<PlusOutlined />} onClick={addVariant}>
                Thêm biến thể
              </Button>
            </div>
          ) : (
            <Text type="secondary">Bật “Kích hoạt biến thể” để thêm size/màu; mỗi biến thể có 1 ảnh chính và nhiều ảnh phụ.</Text>
          )}

          <Divider />
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={saving}>
              Lưu sản phẩm
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Row>

      {/* Modal: Category */}
      <Modal
        title="Thêm danh mục"
        open={catModalOpen}
        onOk={async () => {
          if (!catName.trim()) return message.warning("Nhập tên danh mục");
          try {
            const { data } = await raw.post("/admin/categories", { name: catName.trim() });
            const cat = (data?.data ?? data) as any;
            const normalized = { id: Number(cat.id), name: cat.name } as Category;
            setCategories((prev) => [normalized, ...prev]);
            form.setFieldValue("category_id", normalized.id);
            setCatModalOpen(false);
            setCatName("");
            message.success("Đã tạo danh mục");
          } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.message || "Không tạo được danh mục");
          }
        }}
        onCancel={() => setCatModalOpen(false)}
        okText="Tạo"
        cancelText="Huỷ"
      >
        <Input placeholder="Tên danh mục" value={catName} onChange={(e) => setCatName(e.target.value)} />
      </Modal>

      {/* Modal: Attribute */}
      <Modal
        title={attrModalOpen === "size" ? "Thêm Size (attributes)" : "Thêm Color (attributes)"}
        open={!!attrModalOpen}
        onOk={async () => {
          if (!attrValue.trim() || !attrModalOpen) return message.warning("Nhập giá trị");
          try {
            const { data } = await raw.post("/admin/attributes", { type: attrModalOpen, value: attrValue.trim() });
            const attr = (data?.data ?? data) as Attribute;
            if (attrModalOpen === "size") setSizes((prev) => [attr, ...prev]);
            else setColors((prev) => [attr, ...prev]);
            setAttrModalOpen(null);
            setAttrValue("");
            message.success(`Đã tạo ${attrModalOpen}`);
          } catch (e: any) {
            console.error(e);
            message.error(e?.response?.data?.message || "Không tạo được thuộc tính");
          }
        }}
        onCancel={() => setAttrModalOpen(null)}
        okText="Tạo"
        cancelText="Huỷ"
      >
        <Input
          placeholder={attrModalOpen === "size" ? "VD: 36, 37, L, XL..." : "VD: Red, #FF0000..."}
          value={attrValue}
          onChange={(e) => setAttrValue(e.target.value)}
        />
      </Modal>

      {/* Modal: Preview ảnh lớn */}
      <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={() => setPreviewOpen(false)} width={900}>
        <img alt={previewTitle} src={previewSrc} style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }} />
      </Modal>

      {/* ===== CSS nhúng ===== */}
      <style>{`
        /* Ảnh sản phẩm */
        .upload-cover .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-cover .ant-upload.ant-upload-select-picture-card {
          width: 160px;
          height: 160px;
        }

        /* Ảnh biến thể & album */
        .upload-variant-main .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-variant-main .ant-upload.ant-upload-select-picture-card,
        .upload-variant-album .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-variant-album .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
        }

        /* Khung upload đẹp, nổi bật */
        .pretty-upload .ant-upload-select,
        .pretty-upload .ant-upload-list-picture-card .ant-upload-list-item {
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,.06);
        }
        .pretty-upload .ant-upload.ant-upload-select-picture-card {
          border: 1px dashed #d9d9d9;
          transition: all .2s ease;
        }
        .pretty-upload .ant-upload.ant-upload-select-picture-card:hover {
          border-color: #000;
          box-shadow: 0 4px 18px rgba(0, 0, 0, .08);
          transform: translateY(-1px);
        }

        /* Card biến thể */
        .mb-3 { margin-bottom: 12px; }
        .rounded-xl { border-radius: 12px; }
        .shadow-xs { box-shadow: 0 1px 6px rgba(0,0,0,.05); }
      `}</style>
    </div>
  );
}
