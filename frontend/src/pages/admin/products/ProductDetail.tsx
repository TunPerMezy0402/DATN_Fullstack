// src/pages/admin/products/ProductDetail.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Spin,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SaveOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useNavigate, useParams } from "react-router-dom";
import axios, { AxiosInstance } from "axios";

const { Title, Text } = Typography;

/* ============================== Types ============================== */
interface Category { id: number; name: string; }
interface Attribute { id: number; type: "size" | "color"; value: string; }
interface VariantForm {
  id?: number;
  size_id: number | null;
  color_id: number | null;
  sku: string;
  price: string;
  discount_price: string;
  stock_quantity: number;
  is_available: boolean;
  mainFiles: UploadFile[];
  albumFiles: UploadFile[];
  isEditing?: boolean;
  deletedMainImage?: boolean;
  deletedAlbumUrls?: string[];
}
interface ProductVariant {
  id: number;
  size_id?: number | null;
  color_id?: number | null;
  sku?: string | null;
  price?: string | number | null;
  discount_price?: string | number | null;
  stock_quantity?: number | null;
  is_available?: boolean | number | null;
  image?: string | null;
  images?: string[] | null;
}
interface CategoryOption { value: number; label: string; }
interface Product {
  id: number;
  name: string;
  sku?: string | null;
  category_id?: number | string | null;
  origin?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  variation_status?: boolean | number;
  variants?: ProductVariant[];
  category?: { id: number | string; name: string } | null;
  category_option?: CategoryOption | null;
}
interface FormValues {
  name: string;
  sku: string;
  category_id?: number;
  origin: string;
  brand: string;
  description: string;
}

/* ============================== Constants ============================== */
const API_URL = process.env?.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const API_ORIGIN = API_URL.replace(/\/?api\/?$/, "");
const SKU_LENGTH = 9;
const SKU_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MAX_IMAGE_SIZE_MB = 8;

/* ============================== API Client ============================== */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({ baseURL: API_URL, timeout: 20000 });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
};
const apiClient = createApiClient();

/* ============================== Utils ============================== */
const generateSku = (length: number = SKU_LENGTH): string => {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (num) => SKU_CHARS[num % SKU_CHARS.length]).join("");
};
const parseMoneyNumber = (input: string | number | null | undefined): number | null => {
  if (input === null || input === undefined || input === "") return null;
  const num = Number(input);
  return Number.isFinite(num) && num >= 0 ? num : null;
};
const moneyToApiString = (input: string | number | null | undefined): string | null => {
  const num = parseMoneyNumber(input);
  return num === null ? null : String(num);
};
const getFileBasename = (path: string): string => path.split("/").pop() || "image.jpg";
const toServerPath = (url: string): string => {
  const escapedOrigin = API_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return url.replace(new RegExp(`^${escapedOrigin}/`), "");
};
const buildFullUrl = (path: string): string => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.replace(/^\/+/, "");
  return `${API_ORIGIN}/${cleanPath}`;
};
const createUploadFile = (pathOrUrl: string, uidPrefix: string): UploadFile => ({
  uid: `${uidPrefix}-${Math.random().toString(36).slice(2, 11)}`,
  name: getFileBasename(pathOrUrl),
  status: "done",
  url: buildFullUrl(pathOrUrl),
});
const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
});

/** Chuẩn hoá ID: chỉ nhận số dương, bỏ "", null, undefined, 0 */
const toNumId = (raw: any): number | undefined => {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/* ============================== Data Hooks ============================== */
const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/admin/categories", { params: { per_page: 1000 } });
        const data = Array.isArray(res.data) ? res.data : res.data?.data?.data || res.data?.data || [];
        setCategories(data.map((c: any) => ({ id: Number(c.id), name: c.name })));
      } catch (e: any) {
        console.error(e);
        message.error(e?.response?.data?.message || "Không tải được danh mục");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addCategory = useCallback((category: Category) => {
    setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [category, ...prev]));
  }, []);

  return { categories, loading, addCategory };
};

const useAttributes = () => {
  const [sizes, setSizes] = useState<Attribute[]>([]);
  const [colors, setColors] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          apiClient.get("/admin/attributes", { params: { type: "size", per_page: 1000 } }),
          apiClient.get("/admin/attributes", { params: { type: "color", per_page: 1000 } }),
        ]);
        const sData = Array.isArray(sRes.data) ? sRes.data : sRes.data?.data?.data || sRes.data?.data || [];
        const cData = Array.isArray(cRes.data) ? cRes.data : cRes.data?.data?.data || cRes.data?.data || [];
        setSizes(sData);
        setColors(cData);
      } catch (e: any) {
        console.error(e);
        message.error(e?.response?.data?.message || "Không tải được thuộc tính");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addSize = useCallback((size: Attribute) => setSizes((prev) => [size, ...prev]), []);
  const addColor = useCallback((color: Attribute) => setColors((prev) => [color, ...prev]), []);

  return { sizes, colors, loading, addSize, addColor };
};

/* ============================== Validation ============================== */
const validateVariants = (variants: VariantForm[]): { valid: boolean; error?: string } => {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const price = parseMoneyNumber(v.price);
    const discountPrice = parseMoneyNumber(v.discount_price);
    if (price === null) return { valid: false, error: `Biến thể #${i + 1}: Vui lòng nhập giá hợp lệ` };
    if (discountPrice !== null && discountPrice > price)
      return { valid: false, error: `Biến thể #${i + 1}: Giá khuyến mãi không được cao hơn giá gốc` };
  }
  const seen = new Map<string, number>();
  for (let i = 0; i < variants.length; i++) {
    const s = variants[i].size_id ?? "null";
    const c = variants[i].color_id ?? "null";
    const key = `${s}|${c}`;
    if (seen.has(key)) {
      const j = seen.get(key)!;
      return { valid: false, error: `Biến thể #${i + 1} trùng (size, màu) với biến thể #${j + 1}` };
    }
    seen.set(key, i);
  }
  return { valid: true };
};

const requiredCategoryValidator = (_: any, value: any) => {
  if (typeof value === "number" && value > 0) return Promise.resolve();
  return Promise.reject(new Error("Vui lòng chọn danh mục"));
};

/* ============================== Upload Helpers ============================== */
const beforeUpload = (file: RcFile): boolean | typeof Upload.LIST_IGNORE => {
  const isImage = file.type.startsWith("image/");
  if (!isImage) { message.error("Chỉ chấp nhận file ảnh"); return Upload.LIST_IGNORE; }
  const isValidSize = file.size / 1024 / 1024 < MAX_IMAGE_SIZE_MB;
  if (!isValidSize) { message.error(`Ảnh phải nhỏ hơn ${MAX_IMAGE_SIZE_MB}MB`); return Upload.LIST_IGNORE; }
  return false;
};

const readOnlyInputProps = {
  readOnly: true, disabled: true,
  onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => e.preventDefault(),
  style: { userSelect: "none" as const },
};

/* ============================== Component ============================== */
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variationEnabled, setVariationEnabled] = useState(false);
  const [productFile, setProductFile] = useState<UploadFile[]>([]);
  const [productImageRemoved, setProductImageRemoved] = useState(false);
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null);

  // ID danh mục đã chuẩn hoá để preselect
  const [pendingCategoryId, setPendingCategoryId] = useState<number | undefined>(undefined);

  // Preview & modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [attributeModalOpen, setAttributeModalOpen] = useState<"size" | "color" | null>(null);
  const [attributeValue, setAttributeValue] = useState("");

  const { categories, addCategory } = useCategories();
  const { sizes, colors, addSize, addColor } = useAttributes();

  // Chuẩn bị options từ danh mục
  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ label: cat.name, value: Number(cat.id) })),
    [categories]
  );
  const sizeOptions = useMemo(() => sizes.map((s) => ({ label: s.value, value: s.id })), [sizes]);
  const colorOptions = useMemo(() => colors.map((c) => ({ label: c.value, value: c.id })), [colors]);

  /* -------- Load product -------- */
  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/admin/products/${productId}`);
        const product: Product = data?.data ?? data;

        // Basic fields
        form.setFieldsValue({
          name: product.name || "",
          sku: product.sku || "",
          origin: product.origin || "",
          brand: product.brand || "",
          description: product.description || "",
        });

        // Cover image
        if (product.image) {
          setProductFile([createUploadFile(product.image, "product")]);
          setProductImageRemoved(false);
        } else {
          setProductFile([]);
          setProductImageRemoved(false);
        }

        // Variants
        const variantsData: VariantForm[] = (product.variants || []).map((v) => ({
          id: v.id,
          size_id: v.size_id ?? null,
          color_id: v.color_id ?? null,
          sku: String(v.sku || generateSku()),
          price: v.price != null ? String(v.price) : "",
          discount_price: v.discount_price != null ? String(v.discount_price) : "",
          stock_quantity: Number(v.stock_quantity ?? 0),
          is_available: Boolean(v.is_available ?? true),
          mainFiles: v.image ? [createUploadFile(v.image, `variant-${v.id}-main`)] : [],
          albumFiles: Array.isArray(v.images)
            ? v.images.map((img, idx) => createUploadFile(img, `variant-${v.id}-album-${idx}`))
            : [],
          isEditing: false,
          deletedMainImage: false,
          deletedAlbumUrls: [],
        }));
        setVariants(variantsData);
        setVariationEnabled(Boolean(product.variation_status));
        setLoadedProduct(product);

        // >>> Xác định categoryId từ nhiều nguồn và chuẩn hoá
        const picked = toNumId((product as any)?.category_option?.value)
          ?? toNumId((product as any)?.category?.id)
          ?? toNumId(product?.category_id);
        setPendingCategoryId(picked);
      } catch (e: any) {
        console.error(e);
        message.error(e?.response?.data?.message || "Không tải được chi tiết sản phẩm");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  /* -------- Ensure category option + value show -------- */
  useEffect(() => {
    if (pendingCategoryId == null) {
      form.setFieldValue("category_id", undefined);
      return;
    }
    if (!categories.some((c) => c.id === pendingCategoryId)) {
      const label = (loadedProduct as any)?.category?.name
        ?? (loadedProduct as any)?.category_option?.label
        ?? `#${pendingCategoryId}`;
      addCategory({ id: pendingCategoryId, name: String(label) });
    }
    form.setFieldValue("category_id", pendingCategoryId);
  }, [pendingCategoryId, categories, addCategory, form, loadedProduct]);

  /* -------- Variant handlers -------- */
  const handleAddVariant = useCallback(() => {
    setVariants((prev) => ([
      ...prev,
      {
        size_id: null,
        color_id: null,
        sku: generateSku(),
        price: "",
        discount_price: "",
        stock_quantity: 0,
        is_available: true,
        mainFiles: [],
        albumFiles: [],
        isEditing: true,
        deletedMainImage: false,
        deletedAlbumUrls: [],
      },
    ]));
  }, []);

  const handleRemoveVariant = useCallback((index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateVariant = useCallback(
    <K extends keyof VariantForm>(index: number, key: K, value: VariantForm[K]) => {
      setVariants((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [key]: value };
        return updated;
      });
    },
    []
  );

  const handleToggleEditVariant = useCallback((index: number) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      return updated;
    });
  }, []);

  /* -------- Upload handlers -------- */
  const handleProductFileChange = useCallback(({ fileList }: { fileList: UploadFile[] }) => {
    setProductImageRemoved(fileList.length === 0 && productFile.length > 0);
    setProductFile(fileList.slice(-1));
  }, [productFile]);

  const handleVariantMainFileChange = useCallback((index: number, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const updated = [...prev];
      const v = updated[index];
      if (fileList.length === 0 && v.mainFiles.length > 0) {
        updated[index] = { ...v, mainFiles: [], deletedMainImage: true };
      } else {
        updated[index] = { ...v, mainFiles: fileList.slice(-1), deletedMainImage: false };
      }
      return updated;
    });
  }, []);

  const handleVariantAlbumFileChange = useCallback((index: number, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const updated = [...prev];
      const v = updated[index];
      const oldUrls = v.albumFiles.map((f) => f.url).filter(Boolean) as string[];
      const newUrls = fileList.map((f) => f.url).filter(Boolean) as string[];
      const deleted = oldUrls.filter((u) => !newUrls.includes(u));
      updated[index] = { ...v, albumFiles: fileList, deletedAlbumUrls: [...(v.deletedAlbumUrls || []), ...deleted] };
      return updated;
    });
  }, []);

  /* -------- Preview -------- */
  const handlePreview = useCallback(async (file: UploadFile) => {
    let src = file.url;
    if (!src && file.originFileObj) src = await getBase64(file.originFileObj as File);
    if (!src && file.thumbUrl) src = file.thumbUrl;
    setPreviewImage(src || "");
    setPreviewTitle(file.name || "Xem trước");
    setPreviewOpen(true);
  }, []);

  /* -------- Category modal -------- */
  const handleCreateCategory = useCallback(async () => {
    if (!categoryName.trim()) return message.warning("Vui lòng nhập tên danh mục");
    try {
      const { data } = await apiClient.post("/admin/categories", { name: categoryName.trim() });
      const cat = data?.data ?? data;
      const normalized: Category = { id: Number(cat.id), name: cat.name };
      addCategory(normalized);
      setPendingCategoryId(normalized.id); // đồng bộ preselect
      form.setFieldValue("category_id", normalized.id);
      setCategoryModalOpen(false);
      setCategoryName("");
      message.success("Đã tạo danh mục thành công");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không thể tạo danh mục");
    }
  }, [categoryName, addCategory, form]);

  /* -------- Attribute modal -------- */
  const handleCreateAttribute = useCallback(async () => {
    if (!attributeValue.trim() || !attributeModalOpen) return message.warning("Vui lòng nhập giá trị");
    try {
      const { data } = await apiClient.post("/admin/attributes", { type: attributeModalOpen, value: attributeValue.trim() });
      const attr = data?.data ?? data;
      if (attributeModalOpen === "size") addSize(attr); else addColor(attr);
      setAttributeModalOpen(null);
      setAttributeValue("");
      message.success(`Đã tạo ${attributeModalOpen} thành công`);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không thể tạo thuộc tính");
    }
  }, [attributeValue, attributeModalOpen, addSize, addColor]);

  /* -------- Submit -------- */
  const handleSubmit = useCallback(async (values: FormValues) => {
    try {
      setSaving(true);

      if (variationEnabled) {
        const v = validateVariants(variants);
        if (!v.valid) { message.error(v.error); return; }
      }

      const formData = new FormData();
      formData.append("_method", "PUT");

      // Basic
      if (values.name) formData.append("name", values.name);
      if (values.sku) formData.append("sku", values.sku.trim().toUpperCase());
      if (values.category_id != null) formData.append("category_id", String(values.category_id));
      if (values.description !== undefined) formData.append("description", values.description);
      if (values.origin !== undefined) formData.append("origin", values.origin);
      if (values.brand !== undefined) formData.append("brand", values.brand);
      formData.append("variation_status", variationEnabled ? "1" : "0");

      // Product image
      const cover = productFile[0];
      if (productImageRemoved) {
        formData.append("image", ""); // clear
      } else if (cover) {
        const f = cover.originFileObj as RcFile | undefined;
        if (f) formData.append("image", f); else if (cover.url) formData.append("image", toServerPath(cover.url));
      }

      // Variants
      if (variationEnabled) {
        variants.forEach((variant, index) => {
          if (variant.id) formData.append(`variants[${index}][id]`, String(variant.id));
          if (variant.size_id != null) formData.append(`variants[${index}][size_id]`, String(variant.size_id));
          if (variant.color_id != null) formData.append(`variants[${index}][color_id]`, String(variant.color_id));
          if (variant.sku) formData.append(`variants[${index}][sku]`, variant.sku);

          const price = moneyToApiString(variant.price);
          const discountPrice = moneyToApiString(variant.discount_price);
          if (price !== null) formData.append(`variants[${index}][price]`, price);
          if (discountPrice !== null) formData.append(`variants[${index}][discount_price]`, discountPrice);

          formData.append(`variants[${index}][stock_quantity]`, String(variant.stock_quantity));
          formData.append(`variants[${index}][is_available]`, variant.is_available ? "1" : "0");

          // main image
          if (variant.deletedMainImage) {
            formData.append(`variants[${index}][image]`, "");
          } else {
            const main = variant.mainFiles[0];
            if (main) {
              const f = main.originFileObj as RcFile | undefined;
              if (f) formData.append(`variants[${index}][image]`, f);
              else if (main.url) formData.append(`variants[${index}][image]`, toServerPath(main.url));
            }
          }

          // album: images_keep[] + images[]
          const files = variant.albumFiles || [];
          const keptOld = files
            .filter((f) => f.url && !f.originFileObj)
            .filter((f) => !variant.deletedAlbumUrls?.includes(f.url!));
          keptOld.forEach((old) => { if (old.url) formData.append(`variants[${index}][images_keep][]`, toServerPath(old.url)); });
          const newOnes = files.filter((f) => f.originFileObj);
          newOnes.forEach((nf) => { const f = nf.originFileObj as RcFile; if (f) formData.append(`variants[${index}][images][]`, f); });
        });
      }

      await apiClient.post(`/admin/products/${productId}`, formData);
      message.success("Đã cập nhật sản phẩm thành công");
      navigate(0);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Lỗi cập nhật sản phẩm");
    } finally {
      setSaving(false);
    }
  }, [variationEnabled, variants, productFile, productImageRemoved, productId, navigate]);

  /* -------- Loading -------- */
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 420 }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  /* -------- Render -------- */
  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space align="center">
            <Title level={3} style={{ margin: 0 }}>Chi tiết / Chỉnh sửa sản phẩm</Title>
            <Button icon={<ReloadOutlined />} onClick={() => navigate(0)}>Tải lại</Button>
          </Space>
        </Col>

        <Col span={24}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* Basic */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form.Item label="Ảnh sản phẩm (1 ảnh)">
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    maxCount={1}
                    beforeUpload={beforeUpload}
                    fileList={productFile}
                    onChange={handleProductFileChange}
                    onPreview={handlePreview}
                    className="product-image-upload"
                  >
                    {productFile.length === 0 && (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                      </div>
                    )}
                  </Upload>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                    Chỉ chọn 1 ảnh; tối đa {MAX_IMAGE_SIZE_MB}MB. Ảnh public tại storage/img/product.
                  </Text>
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Row gutter={[16, 0]}>
                  <Col xs={24} md={12}>
                    <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}>
                      <Input placeholder="VD: Giày Jordan 1" allowClear />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item label="SKU" name="sku" tooltip="9 ký tự: A-Z, 0-9">
                      <Input {...readOnlyInputProps} maxLength={SKU_LENGTH} placeholder="SKU" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Danh mục"
                      name="category_id"
                      rules={[{ validator: requiredCategoryValidator }]}
                      normalize={(v) => (v == null || v === "" ? undefined : Number(v))}
                    >
                      <Space.Compact style={{ width: "100%" }}>
                        <Select
                          showSearch
                          allowClear
                          placeholder="Chọn danh mục"
                          optionFilterProp="label"
                          options={categoryOptions}
                          value={pendingCategoryId} // <- bind trực tiếp
                          style={{ flex: 1 }}
                          onChange={(val) => {
                            setPendingCategoryId(val ?? undefined);
                            form.setFieldValue("category_id", val ?? undefined);
                          }}
                          onClear={() => {
                            setPendingCategoryId(undefined);
                            form.setFieldValue("category_id", undefined);
                          }}
                        />

                        <Button onClick={() => setCategoryModalOpen(true)}>+ Thêm</Button>
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
                      <Input.TextArea rows={4} placeholder="Mô tả ngắn về sản phẩm" />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>

            {/* Variants */}
            <Divider plain orientation="left">Biến thể</Divider>

            <Space align="center" size="middle" style={{ marginBottom: 16 }}>
              <Text>Kích hoạt biến thể</Text>
              <Switch checked={variationEnabled} onChange={setVariationEnabled} />
            </Space>

            {variationEnabled ? (
              <div>
                {variants.map((variant, index) => (
                  <Card
                    key={`variant-${variant.id || index}`}
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    title={
                      <Space>
                        <Text strong>Biến thể #{index + 1}</Text>
                        {variant.id && <Text type="secondary">(ID: {variant.id})</Text>}
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button
                          type={variant.isEditing ? "primary" : "default"}
                          icon={variant.isEditing ? <CheckOutlined /> : <EditOutlined />}
                          onClick={() => handleToggleEditVariant(index)}
                          size="small"
                        >
                          {variant.isEditing ? "Xong" : "Sửa"}
                        </Button>
                        {variant.isEditing && (
                          <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveVariant(index)} size="small">
                            Xóa
                          </Button>
                        )}
                      </Space>
                    }
                  >
                    <Row gutter={[16, 8]}>
                      {/* Main image */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Ảnh đại diện biến thể">
                          <Upload
                            accept="image/*"
                            listType="picture-card"
                            maxCount={1}
                            beforeUpload={beforeUpload}
                            fileList={variant.mainFiles}
                            onChange={({ fileList }) => handleVariantMainFileChange(index, fileList)}
                            onPreview={handlePreview}
                            className="variant-image-upload"
                            disabled={!variant.isEditing}
                          >
                            {variant.mainFiles.length === 0 && variant.isEditing && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                              </div>
                            )}
                          </Upload>
                          {variant.isEditing && (
                            <Text type="secondary" style={{ fontSize: 11 }}>Xóa ảnh cũ sẽ xóa khỏi server</Text>
                          )}
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
                              value={variant.size_id ?? undefined}
                              onChange={(v) => handleUpdateVariant(index, "size_id", v ?? null)}
                              style={{ flex: 1 }}
                              disabled={!variant.isEditing}
                            />
                            {variant.isEditing && <Button onClick={() => setAttributeModalOpen("size")}>+ Thêm</Button>}
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
                              value={variant.color_id ?? undefined}
                              onChange={(v) => handleUpdateVariant(index, "color_id", v ?? null)}
                              style={{ flex: 1 }}
                              disabled={!variant.isEditing}
                            />
                            {variant.isEditing && <Button onClick={() => setAttributeModalOpen("color")}>+ Thêm</Button>}
                          </Space.Compact>
                        </Form.Item>
                      </Col>

                      {/* SKU */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="SKU biến thể">
                          <Input {...readOnlyInputProps} maxLength={SKU_LENGTH} value={variant.sku} />
                        </Form.Item>
                      </Col>

                      {/* Stock */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Tồn kho">
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            value={variant.stock_quantity}
                            onChange={(v) => handleUpdateVariant(index, "stock_quantity", Number(v) || 0)}
                            placeholder="0"
                            disabled={!variant.isEditing}
                          />
                        </Form.Item>
                      </Col>

                      {/* Price */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Giá">
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            value={variant.price === "" ? undefined : Number(variant.price)}
                            onChange={(v) => handleUpdateVariant(index, "price", v != null ? String(v) : "")}
                            placeholder="0"
                            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(v) => Number(v!.replace(/\$\s?|(,*)/g, ""))}
                            disabled={!variant.isEditing}
                          />
                        </Form.Item>
                      </Col>

                      {/* Discount */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Giá khuyến mãi">
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            value={variant.discount_price === "" ? undefined : Number(variant.discount_price)}
                            onChange={(v) => handleUpdateVariant(index, "discount_price", v != null ? String(v) : "")}
                            placeholder="0"
                            formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            parser={(val) => Number(val!.replace(/\$\s?|(,*)/g, ""))}
                            disabled={!variant.isEditing}
                          />
                        </Form.Item>
                      </Col>

                      {/* Availability */}
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item label="Trạng thái">
                          <Switch
                            checked={variant.is_available}
                            onChange={(checked) => handleUpdateVariant(index, "is_available", checked)}
                            checkedChildren="Có sẵn"
                            unCheckedChildren="Hết hàng"
                            disabled={!variant.isEditing}
                          />
                        </Form.Item>
                      </Col>

                      {/* Album */}
                      <Col span={24}>
                        <Form.Item label="Ảnh phụ của biến thể (nhiều ảnh)">
                          <Upload
                            accept="image/*"
                            listType="picture-card"
                            multiple
                            beforeUpload={beforeUpload}
                            fileList={variant.albumFiles}
                            onChange={({ fileList }) => handleVariantAlbumFileChange(index, fileList)}
                            onPreview={handlePreview}
                            className="variant-album-upload"
                            disabled={!variant.isEditing}
                          >
                            {variant.isEditing && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>Thêm ảnh</div>
                              </div>
                            )}
                          </Upload>
                          {variant.isEditing && (
                            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                              Xóa ảnh cũ sẽ xóa khỏi server. Thêm ảnh mới sẽ giữ lại ảnh cũ + thêm ảnh mới.
                            </Text>
                          )}
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddVariant} block>
                  Thêm biến thể mới
                </Button>
              </div>
            ) : (
              <Text type="secondary">Tắt biến thể: server sẽ giữ nguyên nếu API không có logic xoá.</Text>
            )}

            {/* Actions */}
            <Divider />
            <Space wrap>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                Lưu thay đổi
              </Button>
              <Button onClick={() => navigate(-1)}>Quay lại</Button>
            </Space>
          </Form>
        </Col>
      </Row>

      {/* Category Modal */}
      <Modal
        title="Thêm danh mục mới"
        open={categoryModalOpen}
        onOk={handleCreateCategory}
        onCancel={() => { setCategoryModalOpen(false); setCategoryName(""); }}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Input
          placeholder="Nhập tên danh mục"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          onPressEnter={handleCreateCategory}
          autoFocus
        />
      </Modal>

      {/* Attribute Modal */}
      <Modal
        title={attributeModalOpen === "size" ? "Thêm Size mới" : "Thêm Màu mới"}
        open={!!attributeModalOpen}
        onOk={handleCreateAttribute}
        onCancel={() => { setAttributeModalOpen(null); setAttributeValue(""); }}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Input
          placeholder={attributeModalOpen === "size" ? "VD: 36, 37, L, XL..." : "VD: Red, Blue, #FF0000..."}
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          onPressEnter={handleCreateAttribute}
          autoFocus
        />
      </Modal>

      {/* Preview Modal */}
      <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={() => setPreviewOpen(false)} width={900}>
        <img alt={previewTitle} src={previewImage} style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }} />
      </Modal>

      {/* Styles */}
      <style>{`
        .product-image-upload .ant-upload-list-picture-card .ant-upload-list-item,
        .product-image-upload .ant-upload.ant-upload-select-picture-card {
          width: 160px;
          height: 160px;
          border-radius: 8px;
        }
        .variant-image-upload .ant-upload-list-picture-card .ant-upload-list-item,
        .variant-image-upload .ant-upload.ant-upload-select-picture-card,
        .variant-album-upload .ant-upload-list-picture-card .ant-upload-list-item,
        .variant-album-upload .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
          border-radius: 8px;
        }
        .product-image-upload .ant-upload.ant-upload-select-picture-card,
        .variant-image-upload .ant-upload.ant-upload-select-picture-card,
        .variant-album-upload .ant-upload.ant-upload-select-picture-card {
          border: 1px dashed #d9d9d9;
          transition: all 0.3s ease;
        }
        .product-image-upload .ant-upload.ant-upload-select-picture-card:hover,
        .variant-image-upload .ant-upload.ant-upload-select-picture-card:hover,
        .variant-album-upload .ant-upload.ant-upload-select-picture-card:hover {
          border-color: #1890ff;
        }
        .ant-upload-list-picture-card .ant-upload-list-item {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
