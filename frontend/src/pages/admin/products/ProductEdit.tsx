// src/pages/admin/products/ProductEdit.tsx
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
  Badge,
  Tag,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SaveOutlined,
  ReloadOutlined,
  EditOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  InboxOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useNavigate, useParams } from "react-router-dom";
import axios, { AxiosInstance } from "axios";

const { Title, Text, Paragraph } = Typography;

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
export default function ProductEdit() {
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

        form.setFieldsValue({
          name: product.name || "",
          sku: product.sku || "",
          origin: product.origin || "",
          brand: product.brand || "",
          description: product.description || "",
        });

        if (product.image) {
          setProductFile([createUploadFile(product.image, "product")]);
          setProductImageRemoved(false);
        } else {
          setProductFile([]);
          setProductImageRemoved(false);
        }

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
      setPendingCategoryId(normalized.id);
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

      if (values.name) formData.append("name", values.name);
      if (values.sku) formData.append("sku", values.sku.trim().toUpperCase());
      if (values.category_id != null) formData.append("category_id", String(values.category_id));
      if (values.description !== undefined) formData.append("description", values.description);
      if (values.origin !== undefined) formData.append("origin", values.origin);
      if (values.brand !== undefined) formData.append("brand", values.brand);
      formData.append("variation_status", variationEnabled ? "1" : "0");

      const cover = productFile[0];
      if (productImageRemoved) {
        formData.append("image", "");
      } else if (cover) {
        const f = cover.originFileObj as RcFile | undefined;
        if (f) formData.append("image", f); else if (cover.url) formData.append("image", toServerPath(cover.url));
      }

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
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "70vh",
      }}>
        <Card style={{ textAlign: "center", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <Spin size="large" />
          <Text style={{ display: "block", marginTop: 16, fontSize: 16 }}>Đang tải dữ liệu sản phẩm...</Text>
        </Card>
      </div>
    );
  }

  /* -------- Render -------- */
  return (
    <div style={{ 
      minHeight: "100vh",
      padding: "24px 24px 48px"
    }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <Card 
          style={{ 
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)"
          }}
          bodyStyle={{ padding: "24px 32px" }}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space align="center" size={16}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate(-1)}
                  size="large"
                  style={{ borderRadius: 8 }}
                >
                  Quay lại
                </Button>
                <Divider type="vertical" style={{ height: 32, borderColor: "#d9d9d9" }} />
                <div>
                  <Title level={3} style={{ margin: 0, color: "#1a1a1a" }}>
                    Chỉnh sửa sản phẩm
                  </Title>
                  <Text type="secondary">ID: {productId}</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Tải lại dữ liệu">
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={() => navigate(0)}
                    size="large"
                    style={{ borderRadius: 8 }}
                  >
                    Làm mới
                  </Button>
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </Card>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {/* Product Information Card */}
          <Card 
            title={
              <Space>
                <InfoCircleOutlined style={{ fontSize: 20, color: "#667eea" }} />
                <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin cơ bản</span>
              </Space>
            }
            style={{ 
              marginBottom: 24,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
            bodyStyle={{ padding: 32 }}
          >
            <Row gutter={[24, 24]}>
              {/* Product Image */}
              <Col xs={24} lg={8}>
                <Card 
                  size="small" 
                  style={{ 
                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                    borderRadius: 12,
                    border: "none"
                  }}
                >
                  <Form.Item 
                    label={
                      <Space>
                        <PictureOutlined />
                        <Text strong>Ảnh đại diện sản phẩm</Text>
                      </Space>
                    }
                  >
                    <Upload
                      accept="image/*"
                      listType="picture-card"
                      maxCount={1}
                      beforeUpload={beforeUpload}
                      fileList={productFile}
                      onChange={handleProductFileChange}
                      onPreview={handlePreview}
                      className="product-image-upload-enhanced"
                    >
                      {productFile.length === 0 && (
                        <div style={{ textAlign: "center" }}>
                          <InboxOutlined style={{ fontSize: 32, color: "#667eea" }} />
                          <div style={{ marginTop: 8, color: "#666" }}>Chọn ảnh</div>
                        </div>
                      )}
                    </Upload>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
                      📌 Tối đa {MAX_IMAGE_SIZE_MB}MB, định dạng JPG/PNG
                    </Text>
                  </Form.Item>
                </Card>
              </Col>

              {/* Product Details */}
              <Col xs={24} lg={16}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item 
                      label={<Text strong>Tên sản phẩm</Text>} 
                      name="name" 
                      rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
                    >
                      <Input 
                        placeholder="VD: Giày Jordan 1 Retro High" 
                        allowClear 
                        size="large"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item 
                      label={
                        <Space>
                          <Text strong>SKU</Text>
                          <Tag color="blue">Tự động</Tag>
                        </Space>
                      } 
                      name="sku"
                    >
                      <Input 
                        {...readOnlyInputProps} 
                        maxLength={SKU_LENGTH} 
                        placeholder="Mã SKU tự động" 
                        size="large"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label={<Text strong>Danh mục</Text>}
                      name="category_id"
                      rules={[{ validator: requiredCategoryValidator }]}
                      normalize={(v) => (v == null || v === "" ? undefined : Number(v))}
                    >
                      <Space.Compact style={{ width: "100%" }}>
                        <Select
                          showSearch
                          allowClear
                          placeholder="Chọn danh mục sản phẩm"
                          optionFilterProp="label"
                          options={categoryOptions}
                          value={pendingCategoryId}
                          style={{ flex: 1, borderRadius: "8px 0 0 8px" }}
                          size="large"
                          onChange={(val) => {
                            setPendingCategoryId(val ?? undefined);
                            form.setFieldValue("category_id", val ?? undefined);
                          }}
                          onClear={() => {
                            setPendingCategoryId(undefined);
                            form.setFieldValue("category_id", undefined);
                          }}
                        />
                      </Space.Compact>
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={6}>
                    <Form.Item label={<Text strong>Xuất xứ</Text>} name="origin">
                      <Input 
                        placeholder="VD: USA" 
                        allowClear 
                        size="large"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={6}>
                    <Form.Item label={<Text strong>Thương hiệu</Text>} name="brand">
                      <Input 
                        placeholder="VD: Nike" 
                        allowClear 
                        size="large"
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item label={<Text strong>Mô tả sản phẩm</Text>} name="description">
                      <Input.TextArea 
                        rows={4} 
                        placeholder="Nhập mô tả chi tiết về sản phẩm..."
                        style={{ borderRadius: 8 }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* Variants Section */}
          <Card 
            title={
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <EditOutlined style={{ fontSize: 20, color: "#667eea" }} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>Quản lý biến thể</span>
                    <Badge 
                      count={variants.length} 
                      style={{ backgroundColor: "#667eea" }}
                      showZero
                    />
                  </Space>
                </Col>
                <Col>
                  <Space align="center">
                    <Text>Kích hoạt biến thể:</Text>
                    <Switch 
                      checked={variationEnabled} 
                      onChange={setVariationEnabled}
                      checkedChildren="BẬT"
                      unCheckedChildren="TẮT"
                    />
                  </Space>
                </Col>
              </Row>
            }
            style={{ 
              marginBottom: 24,
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            }}
            bodyStyle={{ padding: 32 }}
          >
            {variationEnabled ? (
              <div>
                {variants.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "60px 20px",
                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                    borderRadius: 12,
                    border: "2px dashed #667eea"
                  }}>
                    <InboxOutlined style={{ fontSize: 64, color: "#667eea", marginBottom: 16 }} />
                    <Title level={4} style={{ color: "#666" }}>Chưa có biến thể nào</Title>
                    <Paragraph type="secondary">Thêm biến thể để quản lý size, màu sắc và giá cả khác nhau</Paragraph>
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<PlusOutlined />} 
                      onClick={handleAddVariant}
                      style={{ borderRadius: 8, height: 48, fontSize: 16 }}
                    >
                      Tạo biến thể đầu tiên
                    </Button>
                  </div>
                ) : (
                  <>
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                      {variants.map((variant, index) => (
                        <Card
                          key={`variant-${variant.id || index}`}
                          style={{ 
                            borderRadius: 12,
                            border: variant.isEditing ? "2px solid #667eea" : "1px solid #e8e8e8",
                            boxShadow: variant.isEditing ? "0 4px 16px rgba(102, 126, 234, 0.2)" : "0 2px 8px rgba(0,0,0,0.08)",
                            transition: "all 0.3s ease"
                          }}
                          bodyStyle={{ padding: 24 }}
                        >
                          <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
                            <Col>
                              <Space size={12}>
                                <Badge 
                                  count={index + 1} 
                                  style={{ 
                                    backgroundColor: variant.isEditing ? "#667eea" : "#999",
                                    fontSize: 14,
                                    fontWeight: "bold"
                                  }}
                                />
                                <Text strong style={{ fontSize: 16 }}>
                                  Biến thể #{index + 1}
                                </Text>
                                {variant.id && (
                                  <Tag color="blue">ID: {variant.id}</Tag>
                                )}
                                {variant.is_available ? (
                                  <Tag color="success">Còn hàng</Tag>
                                ) : (
                                  <Tag color="error">Hết hàng</Tag>
                                )}
                              </Space>
                            </Col>
                            <Col>
                              <Space>
                                <Button
                                  type={variant.isEditing ? "primary" : "default"}
                                  icon={variant.isEditing ? <CheckOutlined /> : <EditOutlined />}
                                  onClick={() => handleToggleEditVariant(index)}
                                  style={{ borderRadius: 8 }}
                                >
                                  {variant.isEditing ? "Hoàn tất" : "Chỉnh sửa"}
                                </Button>
                                {variant.isEditing && (
                                  <Button 
                                    danger 
                                    icon={<DeleteOutlined />} 
                                    onClick={() => handleRemoveVariant(index)}
                                    style={{ borderRadius: 8 }}
                                  >
                                    Xóa
                                  </Button>
                                )}
                              </Space>
                            </Col>
                          </Row>

                          <Row gutter={[16, 16]}>
                            {/* Variant Main Image */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Ảnh đại diện</Text>}>
                                <Upload
                                  accept="image/*"
                                  listType="picture-card"
                                  maxCount={1}
                                  beforeUpload={beforeUpload}
                                  fileList={variant.mainFiles}
                                  onChange={({ fileList }) => handleVariantMainFileChange(index, fileList)}
                                  onPreview={handlePreview}
                                  className="variant-image-upload-enhanced"
                                  disabled={!variant.isEditing}
                                >
                                  {variant.mainFiles.length === 0 && variant.isEditing && (
                                    <div style={{ textAlign: "center" }}>
                                      <PictureOutlined style={{ fontSize: 24, color: "#667eea" }} />
                                      <div style={{ marginTop: 4, fontSize: 12 }}>Chọn ảnh</div>
                                    </div>
                                  )}
                                </Upload>
                              </Form.Item>
                            </Col>

                            {/* Size */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Kích thước</Text>}>
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
                                  {variant.isEditing && (
                                    <Button onClick={() => setAttributeModalOpen("size")}>+</Button>
                                  )}
                                </Space.Compact>
                              </Form.Item>
                            </Col>

                            {/* Color */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Màu sắc</Text>}>
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
                                  {variant.isEditing && (
                                    <Button onClick={() => setAttributeModalOpen("color")}>+</Button>
                                  )}
                                </Space.Compact>
                              </Form.Item>
                            </Col>

                            {/* SKU */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Mã SKU</Text>}>
                                <Input 
                                  {...readOnlyInputProps} 
                                  maxLength={SKU_LENGTH} 
                                  value={variant.sku}
                                  style={{ borderRadius: 6 }}
                                />
                              </Form.Item>
                            </Col>

                            {/* Stock */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Tồn kho</Text>}>
                                <InputNumber
                                  style={{ width: "100%", borderRadius: 6 }}
                                  min={0}
                                  value={variant.stock_quantity}
                                  onChange={(v) => handleUpdateVariant(index, "stock_quantity", Number(v) || 0)}
                                  placeholder="0"
                                  disabled={!variant.isEditing}
                                  prefix="📦"
                                />
                              </Form.Item>
                            </Col>

                            {/* Price */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Giá gốc</Text>}>
                                <InputNumber
                                  style={{ width: "100%", borderRadius: 6 }}
                                  min={0}
                                  value={variant.price === "" ? undefined : Number(variant.price)}
                                  onChange={(v) => handleUpdateVariant(index, "price", v != null ? String(v) : "")}
                                  placeholder="0"
                                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                  parser={(v) => Number(v!.replace(/\$\s?|(,*)/g, ""))}
                                  disabled={!variant.isEditing}
                                  prefix="💰"
                                  suffix="đ"
                                />
                              </Form.Item>
                            </Col>

                            {/* Discount Price */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Giá khuyến mãi</Text>}>
                                <InputNumber
                                  style={{ width: "100%", borderRadius: 6 }}
                                  min={0}
                                  value={variant.discount_price === "" ? undefined : Number(variant.discount_price)}
                                  onChange={(v) => handleUpdateVariant(index, "discount_price", v != null ? String(v) : "")}
                                  placeholder="0"
                                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                  parser={(val) => Number(val!.replace(/\$\s?|(,*)/g, ""))}
                                  disabled={!variant.isEditing}
                                  prefix="🏷️"
                                  suffix="đ"
                                />
                              </Form.Item>
                            </Col>

                            {/* Availability */}
                            <Col xs={24} sm={12} md={8} lg={6}>
                              <Form.Item label={<Text strong>Trạng thái</Text>}>
                                <Switch
                                  checked={variant.is_available}
                                  onChange={(checked) => handleUpdateVariant(index, "is_available", checked)}
                                  checkedChildren="Hiện"
                                  unCheckedChildren="Ẩn"
                                  disabled={!variant.isEditing}
                                  style={{ width: "23%" }}
                                />
                              </Form.Item>
                            </Col>

                            {/* Album Images */}
                            <Col span={24}>
                              <Divider style={{ margin: "12px 0" }} />
                              <Form.Item label={<Text strong>📸 Bộ sưu tập ảnh (Album)</Text>}>
                                <Upload
                                  accept="image/*"
                                  listType="picture-card"
                                  multiple
                                  beforeUpload={beforeUpload}
                                  fileList={variant.albumFiles}
                                  onChange={({ fileList }) => handleVariantAlbumFileChange(index, fileList)}
                                  onPreview={handlePreview}
                                  className="variant-album-upload-enhanced"
                                  disabled={!variant.isEditing}
                                >
                                  {variant.isEditing && (
                                    <div style={{ textAlign: "center" }}>
                                      <PlusOutlined style={{ fontSize: 20, color: "#667eea" }} />
                                      <div style={{ marginTop: 4, fontSize: 12 }}>Thêm ảnh</div>
                                    </div>
                                  )}
                                </Upload>
                                {variant.isEditing && (
                                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                                    💡 Có thể thêm nhiều ảnh. Xóa ảnh cũ sẽ xóa vĩnh viễn khỏi server.
                                  </Text>
                                )}
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </Space>

                    <Button 
                      type="dashed" 
                      icon={<PlusOutlined />} 
                      onClick={handleAddVariant} 
                      block
                      size="large"
                      style={{ 
                        marginTop: 24, 
                        height: 56,
                        borderRadius: 12,
                        fontSize: 16,
                        borderWidth: 2,
                        borderColor: "#667eea",
                        color: "#667eea"
                      }}
                    >
                      Thêm biến thể mới
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                padding: 40,
                background: "#f5f5f5",
                borderRadius: 12
              }}>
                <Text type="secondary" style={{ fontSize: 15 }}>
                  ⚠️ Biến thể đã tắt. Dữ liệu biến thể hiện tại sẽ được giữ nguyên.
                </Text>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <Card 
            style={{ 
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              background: "linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)"
            }}
            bodyStyle={{ padding: "24px 32px" }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Space size={16}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />} 
                    loading={saving}
                    size="large"
                    style={{ 
                      height: 48,
                      borderRadius: 8,
                      fontSize: 16,
                      minWidth: 160,
                      border: "none"
                    }}
                  >
                    Lưu thay đổi
                  </Button>
                  <Button 
                    onClick={() => navigate(-1)}
                    size="large"
                    style={{ height: 48, borderRadius: 8, fontSize: 16 }}
                  >
                    Hủy bỏ
                  </Button>
                </Space>
              </Col>
              <Col>
                <Text type="secondary">
                  💾 Nhấn "Lưu thay đổi" để cập nhật sản phẩm
                </Text>
              </Col>
            </Row>
          </Card>
        </Form>
      </div>

      {/* Category Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: "#667eea" }} />
            <span>Thêm danh mục mới</span>
          </Space>
        }
        open={categoryModalOpen}
        onOk={handleCreateCategory}
        okText="Tạo danh mục"
        cancelText="Hủy"
        okButtonProps={{ style: { borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
      >
        <Input
          placeholder="Nhập tên danh mục..."
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          onPressEnter={handleCreateCategory}
          autoFocus
          size="large"
          style={{ borderRadius: 8, marginTop: 16 }}
        />
      </Modal>

      {/* Attribute Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: "#667eea" }} />
            <span>{attributeModalOpen === "size" ? "Thêm Size mới" : "Thêm Màu mới"}</span>
          </Space>
        }
        open={!!attributeModalOpen}
        onOk={handleCreateAttribute}
        onCancel={() => { setAttributeModalOpen(null); setAttributeValue(""); }}
        okText="Tạo"
        cancelText="Hủy"
        okButtonProps={{ style: { borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
      >
        <Input
          placeholder={attributeModalOpen === "size" ? "VD: 36, 37, L, XL..." : "VD: Red, Blue, #FF0000..."}
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          onPressEnter={handleCreateAttribute}
          autoFocus
          size="large"
          style={{ borderRadius: 8, marginTop: 16 }}
        />
      </Modal>

      {/* Preview Modal */}
      <Modal 
        open={previewOpen} 
        title={previewTitle} 
        footer={null} 
        onCancel={() => setPreviewOpen(false)} 
        width={900}
        style={{ top: 20 }}
      >
        <img 
          alt={previewTitle} 
          src={previewImage} 
          style={{ 
            width: "100%", 
            maxHeight: "75vh", 
            objectFit: "contain",
            borderRadius: 8
          }} 
        />
      </Modal>
      <style>
      </style>

      {/* Enhanced Styles */}
      <style>{`
        .product-image-upload-enhanced .ant-upload-list-picture-card .ant-upload-list-item,
        .product-image-upload-enhanced .ant-upload.ant-upload-select-picture-card {
          width: 200px;
          height: 200px;
          border-radius: 12px;
        }
        
        .variant-image-upload-enhanced .ant-upload-list-picture-card .ant-upload-list-item,
        .variant-image-upload-enhanced .ant-upload.ant-upload-select-picture-card {
          width: 140px;
          height: 140px;
          border-radius: 12px;
        }
        
        .variant-album-upload-enhanced .ant-upload-list-picture-card .ant-upload-list-item,
        .variant-album-upload-enhanced .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
          margin-right: 10px;
          border-radius: 12px;
        }
        
        .product-image-upload-enhanced .ant-upload.ant-upload-select-picture-card,
        .variant-image-upload-enhanced .ant-upload.ant-upload-select-picture-card,
        .variant-album-upload-enhanced .ant-upload.ant-upload-select-picture-card {
          border: 2px dashed #d9d9d9;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
        }
        
        .product-image-upload-enhanced .ant-upload.ant-upload-select-picture-card:hover,
        .variant-image-upload-enhanced .ant-upload.ant-upload-select-picture-card:hover,
        .variant-album-upload-enhanced .ant-upload.ant-upload-select-picture-card:hover {
          border-color: #667eea;
          background: linear-gradient(135deg, #e8eaff 0%, #ffffff 100%);
        }
        
        .ant-upload-list-picture-card .ant-upload-list-item {
          border-radius: 12px;
          border: 1px solid #e8e8e8;
        }
        
        .ant-card {
          transition: all 0.3s ease;
        }
        
        .ant-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .ant-input:focus,
        .ant-input-number:focus,
        .ant-select-focused .ant-select-selector {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }
      `}</style>
    </div>
  );
}