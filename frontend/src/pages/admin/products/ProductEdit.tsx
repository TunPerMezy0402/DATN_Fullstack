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
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useNavigate, useParams } from "react-router-dom";
import axios, { AxiosInstance } from "axios";

const { Title, Text } = Typography;

/* ============================== Types ============================== */
interface Category { 
  id: number; 
  name: string; 
}

interface Attribute { 
  id: number; 
  type: "size" | "color"; 
  value: string; 
}

interface VariantForm {
  id?: number;
  size_id: number | null;
  color_id: number | null;
  sku: string;
  price: string;
  discount_price: string;
  stock_quantity: number;
  is_available: boolean;
  imageFile: UploadFile[];
  deletedMainImage?: boolean;
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
}

interface CategoryOption { 
  value: number; 
  label: string; 
}

interface Product {
  id: number;
  name: string;
  sku?: string | null;
  category_id?: number | string | null;
  origin?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string[] | null;
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
const API_URL =
  (import.meta as any).env?.VITE_API_URL || 
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

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

const parseImages = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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

const readOnlyInputProps = {
  readOnly: true, 
  disabled: true,
  onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => e.preventDefault(),
  style: { userSelect: "none" as const },
};

/* ============================== Validation ============================== */
const validateVariants = (variants: VariantForm[]): { valid: boolean; error?: string } => {
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const price = parseMoneyNumber(v.price);
    const discountPrice = parseMoneyNumber(v.discount_price);
    
    if (price === null) {
      return { valid: false, error: `Biến thể #${i + 1}: Vui lòng nhập giá hợp lệ` };
    }
    if (discountPrice !== null && discountPrice > price) {
      return { valid: false, error: `Biến thể #${i + 1}: Giá khuyến mãi không được cao hơn giá gốc` };
    }
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
  if (!isImage) { 
    message.error("Chỉ chấp nhận file ảnh"); 
    return Upload.LIST_IGNORE; 
  }
  const isValidSize = file.size / 1024 / 1024 < MAX_IMAGE_SIZE_MB;
  if (!isValidSize) { 
    message.error(`Ảnh phải nhỏ hơn ${MAX_IMAGE_SIZE_MB}MB`); 
    return Upload.LIST_IGNORE; 
  }
  return false;
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
  
  // Categories & Attributes
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Attribute[]>([]);
  const [colors, setColors] = useState<Attribute[]>([]);
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<number | undefined>(undefined);
  
  // Product images
  const [productMainFile, setProductMainFile] = useState<UploadFile[]>([]);
  const [productMainImageRemoved, setProductMainImageRemoved] = useState(false);
  const [productAlbumFiles, setProductAlbumFiles] = useState<UploadFile[]>([]);
  const [deletedAlbumUrls, setDeletedAlbumUrls] = useState<string[]>([]);
  
  // Variants
  const [variants, setVariants] = useState<VariantForm[]>([]);
  
  // Preview & modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [attributeModalOpen, setAttributeModalOpen] = useState<"size" | "color" | null>(null);
  const [attributeValue, setAttributeValue] = useState("");

  /* -------- Load categories and attributes -------- */
  useEffect(() => {
    (async () => {
      try {
        const catRes = await apiClient.get("/admin/categories", { params: { per_page: 1000 } });
        const cats: Category[] = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.data?.data || catRes.data?.data || [];
        setCategories(cats.map((c: any) => ({ id: Number(c.id), name: c.name })));

        const [sz, cl] = await Promise.all([
          apiClient.get("/admin/attributes", { params: { type: "size", per_page: 1000 } }),
          apiClient.get("/admin/attributes", { params: { type: "color", per_page: 1000 } }),
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

        // Product main image
        if (product.image) {
          setProductMainFile([createUploadFile(product.image, "product-main")]);
          setProductMainImageRemoved(false);
        } else {
          setProductMainFile([]);
          setProductMainImageRemoved(false);
        }

        // Product album images - HIỂN THỊ NHIỀU ẢNH (parse giống ProductDetail)
        const productImages = parseImages(product.images);
        if (productImages.length > 0) {
          setProductAlbumFiles(
            productImages.map((img, idx) => createUploadFile(img, `product-album-${idx}`))
          );
        } else {
          setProductAlbumFiles([]);
        }
        setDeletedAlbumUrls([]);

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
          imageFile: v.image ? [createUploadFile(v.image, `variant-${v.id}-main`)] : [],
          deletedMainImage: false,
        }));
        setVariants(variantsData);
        setVariationEnabled(Boolean(product.variation_status));
        setLoadedProduct(product);

        // Category handling
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
  }, [productId, form]);

  /* -------- Sync category_id with form -------- */
  useEffect(() => {
    if (pendingCategoryId == null) {
      form.setFieldValue("category_id", undefined);
      return;
    }
    
    if (!categories.some((c) => c.id === pendingCategoryId)) {
      const label = (loadedProduct as any)?.category?.name
        ?? (loadedProduct as any)?.category_option?.label
        ?? `#${pendingCategoryId}`;
      
      setCategories((prev) => [{ id: pendingCategoryId, name: String(label) }, ...prev]);
    }
    
    form.setFieldValue("category_id", pendingCategoryId);
  }, [pendingCategoryId, categories, form, loadedProduct]);

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ label: cat.name, value: Number(cat.id) })),
    [categories]
  );
  
  const sizeOptions = useMemo(
    () => sizes.map((s) => ({ label: s.value, value: s.id })), 
    [sizes]
  );
  
  const colorOptions = useMemo(
    () => colors.map((c) => ({ label: c.value, value: c.id })), 
    [colors]
  );

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
        imageFile: [],
        deletedMainImage: false,
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

  const handleDuplicateVariant = useCallback((index: number) => {
    const source = variants[index];
    if (!source) return;
    
    const copied: VariantForm = {
      size_id: source.size_id,
      color_id: source.color_id,
      sku: generateSku(),
      price: source.price,
      discount_price: source.discount_price,
      stock_quantity: source.stock_quantity,
      is_available: source.is_available,
      imageFile: [],
      deletedMainImage: false,
    };

    setVariants((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copied);
      return next;
    });

    message.success(`Đã sao chép biến thể #${index + 1} (không bao gồm ảnh, vui lòng upload lại)`);
    
    setTimeout(() => {
      const cards = document.querySelectorAll('.variant-list .ant-card');
      const targetCard = cards[index + 1] as HTMLElement;
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.animation = 'highlight-card 1s ease';
      }
    }, 100);
  }, [variants]);

  /* -------- Upload handlers -------- */
  const handleProductMainFileChange = useCallback(({ fileList }: { fileList: UploadFile[] }) => {
    setProductMainImageRemoved(fileList.length === 0 && productMainFile.length > 0);
    setProductMainFile(fileList.slice(-1));
  }, [productMainFile]);

  const handleProductAlbumFilesChange = useCallback(({ fileList }: { fileList: UploadFile[] }) => {
    const oldUrls = productAlbumFiles.map((f) => f.url).filter(Boolean) as string[];
    const newUrls = fileList.map((f) => f.url).filter(Boolean) as string[];
    const deleted = oldUrls.filter((u) => !newUrls.includes(u));
    
    setProductAlbumFiles(fileList);
    setDeletedAlbumUrls((prev) => [...prev, ...deleted]);
  }, [productAlbumFiles]);

  const handleVariantImageChange = useCallback((index: number, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const updated = [...prev];
      const v = updated[index];
      if (fileList.length === 0 && v.imageFile.length > 0) {
        updated[index] = { ...v, imageFile: [], deletedMainImage: true };
      } else {
        updated[index] = { ...v, imageFile: fileList.slice(-1), deletedMainImage: false };
      }
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
      
      setCategories((prev) => [normalized, ...prev]);
      setPendingCategoryId(normalized.id);
      form.setFieldValue("category_id", normalized.id);
      
      setCategoryModalOpen(false);
      setCategoryName("");
      message.success("Đã tạo danh mục thành công");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không thể tạo danh mục");
    }
  }, [categoryName, form]);

  /* -------- Attribute modal -------- */
  const handleCreateAttribute = useCallback(async () => {
    if (!attributeValue.trim() || !attributeModalOpen) {
      return message.warning("Vui lòng nhập giá trị");
    }
    try {
      const { data } = await apiClient.post("/admin/attributes", { 
        type: attributeModalOpen, 
        value: attributeValue.trim() 
      });
      const attr = data?.data ?? data;
      
      if (attributeModalOpen === "size") {
        setSizes((prev) => [attr, ...prev]);
      } else {
        setColors((prev) => [attr, ...prev]);
      }
      
      setAttributeModalOpen(null);
      setAttributeValue("");
      message.success(`Đã tạo ${attributeModalOpen} thành công`);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Không thể tạo thuộc tính");
    }
  }, [attributeValue, attributeModalOpen]);

  /* -------- Submit -------- */
  const handleSubmit = useCallback(async (values: FormValues) => {
    try {
      setSaving(true);

      if (variationEnabled) {
        const v = validateVariants(variants);
        if (!v.valid) { 
          message.error(v.error); 
          return; 
        }
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

      // Product main image
      const mainCover = productMainFile[0];
      if (productMainImageRemoved) {
        formData.append("image", "");
      } else if (mainCover) {
        const f = mainCover.originFileObj as RcFile | undefined;
        if (f) formData.append("image", f);
        else if (mainCover.url) formData.append("image", toServerPath(mainCover.url));
      }

      // Product album images
      const keptOldAlbum = productAlbumFiles
        .filter((f) => f.url && !f.originFileObj)
        .filter((f) => !deletedAlbumUrls.includes(f.url!));
      keptOldAlbum.forEach((old) => {
        if (old.url) formData.append("images_keep[]", toServerPath(old.url));
      });

      const newAlbumFiles = productAlbumFiles.filter((f) => f.originFileObj);
      newAlbumFiles.forEach((nf) => {
        const f = nf.originFileObj as RcFile;
        if (f) formData.append("images[]", f);
      });

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

          // Variant image
          if (variant.deletedMainImage) {
            formData.append(`variants[${index}][image]`, "");
          } else {
            const variantImageFile = variant.imageFile[0];
            if (variantImageFile) {
              const f = variantImageFile.originFileObj as RcFile | undefined;
              if (f) formData.append(`variants[${index}][image]`, f);
              else if (variantImageFile.url) {
                formData.append(`variants[${index}][image]`, toServerPath(variantImageFile.url));
              }
            }
          }
        });
      }

      await apiClient.post(`/admin/products/${productId}`, formData);
      message.success("Đã cập nhật sản phẩm thành công");
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.message || "Lỗi cập nhật sản phẩm");
    } finally {
      setSaving(false);
    }
  }, [variationEnabled, variants, productMainFile, productMainImageRemoved, productAlbumFiles, deletedAlbumUrls, productId, navigate]);

  /* -------- Loading -------- */
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Đang tải dữ liệu sản phẩm...</div>
      </div>
    );
  }

  /* ============================== Render ============================== */
  return (
    <div className="p-4">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={3}>Chỉnh sửa sản phẩm - ID: {productId}</Title>
        </Col>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[16, 16]} align="top">
            {/* Product Images Section */}
            <Col xs={24} md={8}>
              <Card title="Ảnh sản phẩm" size="small" className="rounded-xl shadow-xs">
                <Form.Item label="Ảnh chính (1 ảnh)">
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    maxCount={1}
                    beforeUpload={beforeUpload}
                    fileList={productMainFile}
                    onChange={handleProductMainFileChange}
                    onPreview={handlePreview}
                    showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                    className="upload-product-main pretty-upload"
                  >
                    {productMainFile.length >= 1 ? null : (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>Chọn ảnh chính</div>
                      </div>
                    )}
                  </Upload>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    Ảnh đại diện sản phẩm (tối đa {MAX_IMAGE_SIZE_MB}MB)
                  </div>
                </Form.Item>

                <Form.Item label="Album ảnh (nhiều ảnh)">
                  <Upload
                    accept="image/*"
                    listType="picture-card"
                    multiple
                    beforeUpload={beforeUpload}
                    fileList={productAlbumFiles}
                    onChange={handleProductAlbumFilesChange}
                    onPreview={handlePreview}
                    showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                    className="upload-product-album pretty-upload"
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Thêm ảnh</div>
                    </div>
                  </Upload>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    Có thể chọn nhiều ảnh (mỗi ảnh tối đa {MAX_IMAGE_SIZE_MB}MB)
                  </div>
{/*                   {productAlbumFiles.length > 0 && (
                    <div style={{ fontSize: 13, color: "#1890ff", marginTop: 8, fontWeight: 500 }}>
                      ✅ Đang hiển thị {productAlbumFiles.length} ảnh album
                    </div>
                  )} */}
                </Form.Item>
              </Card>
            </Col>

            {/* Product Info Section */}
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

                <Col xs={24} md={12}>
                  <Form.Item label="SKU (tự tạo)" name="sku" tooltip="Tự động 9 ký tự: A–Z, 0–9">
                    <Input {...readOnlyInputProps} maxLength={9} placeholder="SKU tự động" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    label="Danh mục"
                    name="category_id"
                    rules={[{ validator: requiredCategoryValidator }]}
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <Select
                        showSearch
                        allowClear
                        placeholder="Chọn danh mục"
                        optionFilterProp="label"
                        options={categoryOptions}
                        value={pendingCategoryId}
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
                    <Input.TextArea rows={4} placeholder="Mô tả ngắn" />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          <Divider plain orientation="left">Biến thể</Divider>
          <Space align="center" size="middle" style={{ marginBottom: 12 }}>
            <Text>Kích hoạt biến thể</Text>
            <Switch checked={variationEnabled} onChange={setVariationEnabled} />
          </Space>

          {variationEnabled ? (
            <div className="variant-list">
              {variants.map((v, idx) => (
                <Card key={`variant-${v.id || idx}`} className="mb-3 rounded-xl shadow-xs" size="small">
                  <div style={{ marginBottom: 12, fontWeight: 600, color: "#1890ff" }}>
                    Biến thể #{idx + 1} {v.id && `(ID: ${v.id})`}
                  </div>
                  
                  <Row gutter={[16, 8]}>
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Ảnh biến thể (1 ảnh)">
                        <Upload
                          accept="image/*"
                          listType="picture-card"
                          maxCount={1}
                          beforeUpload={beforeUpload}
                          fileList={v.imageFile}
                          onChange={({ fileList }) => handleVariantImageChange(idx, fileList)}
                          onPreview={handlePreview}
                          showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                          className="upload-variant-image pretty-upload"
                        >
                          {v.imageFile.length >= 1 ? null : (
                            <div>
                              <UploadOutlined />
                              <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                    </Col>

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
                            onChange={(val) => handleUpdateVariant(idx, "size_id", val ?? null)}
                            style={{ flex: 1 }}
                          />
                          <Button onClick={() => setAttributeModalOpen("size")}>+ Thêm</Button>
                        </Space.Compact>
                      </Form.Item>
                    </Col>

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
                            onChange={(val) => handleUpdateVariant(idx, "color_id", val ?? null)}
                            style={{ flex: 1 }}
                          />
                          <Button onClick={() => setAttributeModalOpen("color")}>+ Thêm</Button>
                        </Space.Compact>
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="SKU biến thể">
                        <Input {...readOnlyInputProps} maxLength={9} value={v.sku} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Tồn kho">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={v.stock_quantity}
                          onChange={(val) => handleUpdateVariant(idx, "stock_quantity", Number(val) || 0)}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Giá">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={Number(v.price || 0)}
                          onChange={(val) =>
                            handleUpdateVariant(idx, "price", val !== null && val !== undefined ? String(val) : "")
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Giá KM">
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          value={Number(v.discount_price || 0)}
                          onChange={(val) =>
                            handleUpdateVariant(
                              idx,
                              "discount_price",
                              val !== null && val !== undefined ? String(val) : ""
                            )
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item label="Trạng thái">
                        <Switch
                          checked={v.is_available}
                          onChange={(val) => handleUpdateVariant(idx, "is_available", val)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Space>
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveVariant(idx)}>
                      Xoá biến thể
                    </Button>
                    <Button 
                      type="dashed" 
                      icon={<CopyOutlined />} 
                      onClick={() => handleDuplicateVariant(idx)}
                    >
                      Sao chép biến thể
                    </Button>
                  </Space>
                </Card>
              ))}

              <Button icon={<PlusOutlined />} onClick={handleAddVariant}>
                Thêm biến thể
              </Button>
            </div>
          ) : (
            <Text type="secondary">Bật "Kích hoạt biến thể" để thêm size/màu</Text>
          )}

          <Divider />
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={saving}>
              Cập nhật sản phẩm
            </Button>
            <Button onClick={() => navigate(-1)}>Huỷ</Button>
          </Space>
        </Form>
      </Row>

      {/* Category Modal */}
      <Modal
        title="Thêm danh mục"
        open={categoryModalOpen}
        onOk={handleCreateCategory}
        onCancel={() => {
          setCategoryModalOpen(false);
          setCategoryName("");
        }}
        okText="Tạo"
        cancelText="Huỷ"
      >
        <Input 
          placeholder="Tên danh mục" 
          value={categoryName} 
          onChange={(e) => setCategoryName(e.target.value)}
          onPressEnter={handleCreateCategory}
        />
      </Modal>

      {/* Attribute Modal */}
      <Modal
        title={attributeModalOpen === "size" ? "Thêm Size" : "Thêm Color"}
        open={!!attributeModalOpen}
        onOk={handleCreateAttribute}
        onCancel={() => { 
          setAttributeModalOpen(null); 
          setAttributeValue(""); 
        }}
        okText="Tạo"
        cancelText="Huỷ"
      >
        <Input
          placeholder={attributeModalOpen === "size" ? "VD: 36, 37, L, XL..." : "VD: Red, #FF0000..."}
          value={attributeValue}
          onChange={(e) => setAttributeValue(e.target.value)}
          onPressEnter={handleCreateAttribute}
        />
      </Modal>

      {/* Preview Modal */}
      <Modal 
        open={previewOpen} 
        title={previewTitle} 
        footer={null} 
        onCancel={() => setPreviewOpen(false)} 
        width={900}
      >
        <img 
          alt={previewTitle} 
          src={previewImage} 
          style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }} 
        />
      </Modal>

      {/* Styles */}
      <style>{`
        .upload-product-main .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-product-main .ant-upload.ant-upload-select-picture-card {
          width: 160px;
          height: 160px;
        }

        .upload-product-album .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-product-album .ant-upload.ant-upload-select-picture-card,
        .upload-variant-image .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-variant-image .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
        }

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
          border-color: #1890ff;
          box-shadow: 0 4px 18px rgba(24, 144, 255, .15);
          transform: translateY(-1px);
        }

        .mb-3 { margin-bottom: 12px; }
        .rounded-xl { border-radius: 12px; }
        .shadow-xs { box-shadow: 0 1px 6px rgba(0,0,0,.05); }

        @keyframes highlight-card {
          0%, 100% {
            box-shadow: 0 1px 6px rgba(0,0,0,.05);
          }
          50% {
            box-shadow: 0 4px 20px rgba(24, 144, 255, .3);
            transform: scale(1.01);
          }
        }

        .p-4 { padding: 16px; }
      `}</style>
    </div>
  );
}