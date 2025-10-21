// src/pages/admin/products/ProductDetail.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UploadOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

/* ============================== Types ============================== */
type Attr = { id: number; value: string };

type Variant = {
  id?: number | null;
  size_id: number | null;
  color_id: number | null;
  sku: string;
  image: string;
  images: string[];
  price: string;
  discount_price: string;
  stock_quantity: number;
  is_available: boolean;
  mainFiles: UploadFile[];
  albumFiles: UploadFile[];
};

type Product = {
  id: number;
  name: string;
  sku?: string | null;
  category_id?: number | null;
  description?: string | null;
  origin?: string | null;
  brand?: string | null;
  image?: string | null;
  variation_status?: boolean | number;
  created_at?: string;
  updated_at?: string;
  category?: { id: number; name: string } | null;
  variants?: any[];
};

type Category = { id: number; name: string };

type ValidationError = {
  field: string;
  message: string;
};

/* ============================== Constants ============================== */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const UPLOAD_ENDPOINT = "/uploads";
const MAX_IMAGE_SIZE_MB = 8;
const SKU_LENGTH = 9;
const MAX_VARIANTS = 100;

/* ============================== Axios Setup ============================== */
const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ============================== Helper Functions ============================== */
const ASSET_BASE = String(API_URL).replace(/\/api\/?$/, "");

const toAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${ASSET_BASE}/${String(url).replace(/^\/+/, "")}`;
};

const parseMaybeImages = (val: unknown): string[] => {
  if (Array.isArray(val)) {
    return val.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  }
  if (typeof val === "string") {
    if (!val.trim()) return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.trim() !== "");
      }
      return [val];
    } catch {
      return [val];
    }
  }
  return [];
};

const cleanseUrls = (arr: string[]) => arr.filter((u) => u && u.trim() !== "");

const toNumberOrUndef = (v: any) =>
  typeof v === "number"
    ? v
    : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))
    ? Number(v)
    : undefined;

const generateSku = (length = SKU_LENGTH): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const cryptoObj: any = (window as any).crypto || (window as any).msCrypto;
  
  if (cryptoObj?.getRandomValues) {
    const arr = new Uint32Array(length);
    cryptoObj.getRandomValues(arr);
    return Array.from(arr, (x) => chars[x % chars.length]).join("");
  }
  
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const parseMoneyNumber = (input: string | number | null | undefined): number | null => {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const moneyToApiString = (v: string | number | null | undefined): string | null => {
  const n = parseMoneyNumber(v);
  return n === null ? null : String(n);
};

const noCopyProps = {
  readOnly: true,
  disabled: true,
  onCopy: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent<HTMLInputElement>) => e.preventDefault(),
  style: { userSelect: "none" as const },
};

/* ============================== Upload Helper ============================== */
async function uploadImage(file: RcFile): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  
  try {
    const { data } = await api.post(UPLOAD_ENDPOINT, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    const url = data?.url ?? data?.data?.url;
    if (!url) throw new Error("Upload không trả về URL");
    return url;
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error?.response?.data?.message || "Lỗi upload ảnh");
  }
}

const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const beforeUpload = (file: RcFile) => {
  if (!file.type.startsWith("image/")) {
    message.error("Chỉ chấp nhận file ảnh (JPG, PNG, WebP, ...)");
    return Upload.LIST_IGNORE;
  }
  if (file.size / 1024 / 1024 >= MAX_IMAGE_SIZE_MB) {
    message.error(`Ảnh phải nhỏ hơn ${MAX_IMAGE_SIZE_MB}MB`);
    return Upload.LIST_IGNORE;
  }
  return true;
};

/* ============================== Validation Functions ============================== */
const validateVariant = (variant: Variant, index: number): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  // Validate Price
  const price = parseMoneyNumber(variant.price);
  if (price === null || price <= 0) {
    errors.push({
      field: "price",
      message: `Biến thể #${index + 1}: Giá phải lớn hơn 0`,
    });
  }
  
  // Validate Discount Price
  const discountPrice = parseMoneyNumber(variant.discount_price);
  if (discountPrice !== null) {
    if (discountPrice < 0) {
      errors.push({
        field: "discount_price",
        message: `Biến thể #${index + 1}: Giá khuyến mãi không được âm`,
      });
    }
    if (price !== null && discountPrice > price) {
      errors.push({
        field: "discount_price",
        message: `Biến thể #${index + 1}: Giá khuyến mãi không được cao hơn giá gốc`,
      });
    }
  }
  
  // Validate Stock
  if (!Number.isFinite(variant.stock_quantity) || variant.stock_quantity < 0) {
    errors.push({
      field: "stock_quantity",
      message: `Biến thể #${index + 1}: Số lượng tồn kho không hợp lệ`,
    });
  }
  
  // Validate SKU
  if (!variant.sku || variant.sku.trim() === "") {
    errors.push({
      field: "sku",
      message: `Biến thể #${index + 1}: SKU không được để trống`,
    });
  }
  
  return errors;
};

const validateVariantUniqueness = (variants: Variant[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const skuMap = new Map<string, number[]>();
  const combinationMap = new Map<string, number[]>();
  
  variants.forEach((variant, index) => {
    // Check SKU uniqueness
    const sku = variant.sku.trim().toUpperCase();
    if (sku) {
      if (!skuMap.has(sku)) {
        skuMap.set(sku, []);
      }
      skuMap.get(sku)!.push(index);
    }
    
    // Check size-color combination uniqueness (only if both are selected)
    if (variant.size_id !== null && variant.color_id !== null) {
      const key = `${variant.size_id}-${variant.color_id}`;
      if (!combinationMap.has(key)) {
        combinationMap.set(key, []);
      }
      combinationMap.get(key)!.push(index);
    }
  });
  
  // Report SKU duplicates
  skuMap.forEach((indices, sku) => {
    if (indices.length > 1) {
      errors.push({
        field: "sku",
        message: `SKU "${sku}" bị trùng ở các biến thể: ${indices.map((i) => `#${i + 1}`).join(", ")}`,
      });
    }
  });
  
  // Report combination duplicates with more detail
  combinationMap.forEach((indices, key) => {
    if (indices.length > 1) {
      const [sizeId, colorId] = key.split("-").map(Number);
      
      // Find size and color names for better error message
      const variant = variants[indices[0]];
      let message = `Tổ hợp Size-Màu bị trùng ở các biến thế: ${indices.map((i) => `#${i + 1}`).join(", ")}`;
      
      errors.push({
        field: "combination",
        message,
      });
    }
  });
  
  return errors;
};

const validateAllVariants = (variants: Variant[]): { isValid: boolean; errors: ValidationError[] } => {
  const allErrors: ValidationError[] = [];
  
  // Validate each variant
  variants.forEach((variant, index) => {
    const errors = validateVariant(variant, index);
    allErrors.push(...errors);
  });
  
  // Validate uniqueness
  const uniquenessErrors = validateVariantUniqueness(variants);
  allErrors.push(...uniquenessErrors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
};

/* ============================== Main Component ============================== */
export default function ProductDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [formProduct] = Form.useForm();

  // UI States
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingOneVariant, setSavingOneVariant] = useState<number | null>(null);

  // Edit Modes
  const [editProduct, setEditProduct] = useState(false);
  const [editingIdxSet, setEditingIdxSet] = useState<Set<number>>(new Set());

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Attr[]>([]);
  const [colors, setColors] = useState<Attr[]>([]);
  const [variationEnabled, setVariationEnabled] = useState(false);

  // Product Image
  const [productImage, setProductImage] = useState<string>("");
  const [productFiles, setProductFiles] = useState<UploadFile[]>([]);

  // Variants
  const [variants, setVariants] = useState<Variant[]>([]);
  const variantSnapRef = useRef<Map<number, Variant>>(new Map());

  // Snapshots
  const productSnapRef = useRef<any>(null);
  const coverSnapRef = useRef<string>("");

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [previewTitle, setPreviewTitle] = useState<string>("Ảnh xem trước");

  /* -------- Load Data -------- */
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catRes, szRes, clRes] = await Promise.all([
          api.get("/admin/categories", { params: { per_page: 1000 } }),
          api.get("/admin/attributes", { params: { type: "size", per_page: 1000 } }),
          api.get("/admin/attributes", { params: { type: "color", per_page: 1000 } }),
        ]);

        const cats: Category[] = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.data?.data || catRes.data?.data || [];
        setCategories(cats.map((c: any) => ({ id: Number(c.id), name: c.name })));

        const sizesList: Attr[] = Array.isArray(szRes.data)
          ? szRes.data
          : szRes.data?.data || szRes.data?.data?.data || [];
        const colorsList: Attr[] = Array.isArray(clRes.data)
          ? clRes.data
          : clRes.data?.data || clRes.data?.data?.data || [];

        setSizes(sizesList);
        setColors(colorsList);
      } catch (error: any) {
        console.error("Load metadata error:", error);
        message.error(error?.response?.data?.message || "Không tải được danh mục/thuộc tính");
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!Number.isFinite(id)) {
        message.error("ID sản phẩm không hợp lệ");
        navigate("/admin/products");
        return;
      }

      try {
        setLoading(true);
        const { data } = await api.get(`/admin/products/${id}`);
        const product: Product = (data?.data ?? data) as Product;

        // Product Cover Image
        const cover = product?.image || "";
        setProductImage(cover);
        setProductFiles(
          cover
            ? [{ uid: "cover-0", name: "cover", status: "done", url: toAssetUrl(cover) } as UploadFile]
            : []
        );

        // Variants
        const pVariants = Array.isArray(product?.variants) ? product.variants : [];
        const uiVariants: Variant[] = pVariants.map((v: any, i: number) => {
          const main = v?.image || "";
          const album: string[] = parseMaybeImages(v?.images);

          return {
            id: typeof v?.id === "number" ? v.id : typeof v?.id === "string" ? Number(v.id) : undefined,
            size_id: toNumberOrUndef(v?.size_id) ?? null,
            color_id: toNumberOrUndef(v?.color_id) ?? null,
            sku: (v?.sku && String(v.sku)) || generateSku(),
            image: main || "",
            images: cleanseUrls(album || []),
            price: v?.price ? String(v.price) : "",
            discount_price: v?.discount_price ? String(v.discount_price) : "",
            stock_quantity: toNumberOrUndef(v?.stock_quantity) ?? 0,
            is_available: !!v?.is_available,
            mainFiles: main
              ? [
                  {
                    uid: `v-main-${i}`,
                    name: `variant-main-${i}`,
                    status: "done",
                    url: toAssetUrl(main),
                  } as UploadFile,
                ]
              : [],
            albumFiles: (album || []).map((u, k) => ({
              uid: `v-alb-${i}-${k}`,
              name: `variant-album-${i}-${k}`,
              status: "done",
              url: toAssetUrl(u),
            })) as UploadFile[],
          };
        });

        setVariants(uiVariants);
        setVariationEnabled(uiVariants.length > 0);

        // Form Values
        const initVals = {
          name: product?.name || "",
          sku: (product?.sku && String(product.sku)) || "",
          category_id: toNumberOrUndef(product?.category_id) ?? undefined,
          origin: product?.origin || "",
          brand: product?.brand || "",
          description: product?.description || "",
        };
        formProduct.setFieldsValue(initVals);

        // Snapshots
        productSnapRef.current = { ...initVals };
        coverSnapRef.current = cover;

        setEditProduct(false);
        setEditingIdxSet(new Set());
        variantSnapRef.current.clear();
      } catch (error: any) {
        console.error("Load product error:", error);
        message.error(error?.response?.data?.message || "Không tải được sản phẩm");
        navigate("/admin/products");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, navigate, formProduct]);

  /* -------- Options -------- */
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: Number(c.id) })),
    [categories]
  );
  const sizeOptions = useMemo(() => sizes.map((s) => ({ label: s.value, value: Number(s.id) })), [sizes]);
  const colorOptions = useMemo(() => colors.map((c) => ({ label: c.value, value: Number(c.id) })), [colors]);

  /* -------- Variant Helpers -------- */
  const setVariant = <K extends keyof Variant>(idx: number, key: K, value: Variant[K]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  /* -------- Upload: Product -------- */
  const onChangeProductFiles = ({ file, fileList }: { file: UploadFile; fileList: UploadFile[] }) => {
    setProductFiles(fileList.slice(-1));
    if (file.status === "done") {
      const url = (file.response as any)?.url ?? (file.response as any)?.data?.url ?? file.url;
      if (typeof url === "string") {
        setProductImage(url);
        setProductFiles((prev) => prev.map((f) => (f.uid === file.uid ? { ...f, url: toAssetUrl(url) } : f)));
      }
    }
  };

  const onRemoveProductFile = async () => {
    setProductFiles([]);
    setProductImage("");
    return true;
  };

  const productCustomRequest: any = async (options: any) => {
    const { file, onError, onSuccess } = options;
    try {
      const url = await uploadImage(file as RcFile);
      setProductFiles((prev) => {
        const list = [...prev];
        const pos = list.findIndex((f) => f.uid === (file as any).uid);
        if (pos > -1) list[pos] = { ...list[pos], url: toAssetUrl(url) };
        return list;
      });
      setProductImage(url);
      onSuccess({ url }, file);
      message.success("Upload ảnh thành công");
    } catch (error: any) {
      message.error(error.message || "Lỗi upload ảnh");
      onError?.(error);
    }
  };

  /* -------- Upload: Variant Main -------- */
  const onChangeVariantMain = (idx: number, file: UploadFile, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].mainFiles = fileList.slice(-1);
      if (file.status === "done") {
        const url = (file.response as any)?.url ?? (file.response as any)?.data?.url ?? file.url;
        if (typeof url === "string") {
          next[idx].image = url;
          next[idx].mainFiles = next[idx].mainFiles.map((f) =>
            f.uid === file.uid ? { ...f, url: toAssetUrl(url) } : f
          );
        }
      }
      return next;
    });
  };

  const onRemoveVariantMain = (idx: number) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].mainFiles = [];
      next[idx].image = "";
      return next;
    });
    return true;
  };

  const variantMainCustomRequest = (idx: number) => {
    const handler: any = async (options: any) => {
      const { file, onError, onSuccess } = options;
      try {
        const url = await uploadImage(file as RcFile);
        setVariants((prev) => {
          const next = [...prev];
          const list = [...(next[idx].mainFiles || [])];
          const pos = list.findIndex((f) => f.uid === (file as any).uid);
          if (pos > -1) list[pos] = { ...list[pos], url: toAssetUrl(url) };
          next[idx].mainFiles = list;
          next[idx].image = url;
          return next;
        });
        onSuccess({ url }, file);
        message.success("Upload ảnh biến thể thành công");
      } catch (error: any) {
        message.error(error.message || "Lỗi upload ảnh");
        onError?.(error);
      }
    };
    return handler;
  };

  /* -------- Upload: Variant Album -------- */
  const onChangeVariantAlbum = (idx: number, file: UploadFile, fileList: UploadFile[]) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].albumFiles = fileList;
      if (file.status === "done") {
        const url = (file.response as any)?.url ?? (file.response as any)?.data?.url ?? file.url;
        if (typeof url === "string") {
          next[idx].images = cleanseUrls([...(next[idx].images || []), url]);
          next[idx].albumFiles = next[idx].albumFiles.map((f) =>
            f.uid === file.uid ? { ...f, url: toAssetUrl(url) } : f
          );
        }
      }
      return next;
    });
  };

  const onRemoveVariantAlbum = (idx: number, file: UploadFile) => {
    setVariants((prev) => {
      const next = [...prev];
      next[idx].albumFiles = (next[idx].albumFiles || []).filter((f) => f.uid !== file.uid);
      const raw = (file.url && String(file.url)) || (file.response as any)?.url || (file.response as any)?.data?.url;
      if (raw) {
        next[idx].images = (next[idx].images || []).filter((u) => toAssetUrl(u) !== file.url && u !== raw);
      }
      return next;
    });
    return true;
  };

  const variantAlbumCustomRequest = (idx: number) => {
    const handler: any = async (options: any) => {
      const { file, onError, onSuccess } = options;
      try {
        const url = await uploadImage(file as RcFile);
        setVariants((prev) => {
          const next = [...prev];
          const list = [...(next[idx].albumFiles || [])];
          const pos = list.findIndex((f) => f.uid === (file as any).uid);
          if (pos > -1) list[pos] = { ...list[pos], url: toAssetUrl(url) };
          next[idx].albumFiles = list;
          next[idx].images = cleanseUrls([...(next[idx].images || []), url]);
          return next;
        });
        onSuccess({ url }, file);
      } catch (error: any) {
        message.error(error.message || "Lỗi upload ảnh");
        onError?.(error);
      }
    };
    return handler;
  };

  /* -------- Variant Actions -------- */
  const startEditVariant = (idx: number) => {
    // Check if variant exists
    if (!variants[idx]) {
      console.warn(`Variant at index ${idx} does not exist`);
      return;
    }
    
    setEditingIdxSet((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
    
    // Deep clone the variant for snapshot
    try {
      const snapshot = JSON.parse(JSON.stringify(variants[idx]));
      variantSnapRef.current.set(idx, snapshot);
    } catch (error) {
      console.error('Failed to create variant snapshot:', error);
    }
  };

  const cancelEditVariant = (idx: number) => {
    const snap = variantSnapRef.current.get(idx);
    if (snap) {
      setVariants((prev) => {
        const next = [...prev];
        next[idx] = snap;
        return next;
      });
      variantSnapRef.current.delete(idx);
    }
    setEditingIdxSet((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const saveOneVariant = async (idx: number) => {
    try {
      const variant = variants[idx];
      
      // Validate single variant fields
      const errors = validateVariant(variant, idx);
      if (errors.length > 0) {
        errors.forEach((err) => message.error(err.message));
        return;
      }

      // Check for duplicate size-color combinations with other variants
      const hasDuplicate = variants.some((v, i) => {
        if (i === idx) return false; // Skip self
        if (v.size_id === null || v.color_id === null) return false; // Skip if missing size/color
        if (variant.size_id === null || variant.color_id === null) return false;
        return v.size_id === variant.size_id && v.color_id === variant.color_id;
      });

      if (hasDuplicate) {
        // Find the duplicate variant numbers
        const duplicateIndices = variants
          .map((v, i) => {
            if (i === idx) return -1;
            if (v.size_id === variant.size_id && v.color_id === variant.color_id) return i;
            return -1;
          })
          .filter((i) => i !== -1);

        const sizeName = sizes.find((s) => s.id === variant.size_id)?.value || "N/A";
        const colorName = colors.find((c) => c.id === variant.color_id)?.value || "N/A";

        Modal.error({
          title: "Trùng tổ hợp Size-Màu",
          content: (
            <div>
              <p>
                Biến thể #{idx + 1} có tổ hợp <strong>{sizeName}</strong> + <strong>{colorName}</strong> đã tồn tại ở:
              </p>
              <ul style={{ color: "#ff4d4f", paddingLeft: 20, marginTop: 8 }}>
                {duplicateIndices.map((i) => (
                  <li key={i}>Biến thể #{i + 1}</li>
                ))}
              </ul>
              <p style={{ marginTop: 12 }}>Mỗi tổ hợp Size-Màu phải là duy nhất trong sản phẩm.</p>
            </div>
          ),
        });
        return;
      }

      setSavingOneVariant(idx);

      const values = formProduct.getFieldsValue();
      const dto: any = {
        name: values.name || "",
        category_id:
          typeof values.category_id === "number"
            ? values.category_id
            : values.category_id
            ? Number(values.category_id)
            : null,
        description: values.description ?? null,
        sku: (values.sku && String(values.sku)) || "",
        origin: values.origin ?? null,
        brand: values.brand ?? null,
        image: productImage || null,
        variation_status: true,
        variants: variants.map((v) => ({
          ...(typeof v.id === "number" ? { id: v.id } : {}),
          size_id: v.size_id,
          color_id: v.color_id,
          image: v.image || null,
          images: cleanseUrls(v.images || []),
          sku: v.sku || generateSku(),
          price: moneyToApiString(v.price),
          discount_price: moneyToApiString(v.discount_price),
          stock_quantity: Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0,
          is_available: !!v.is_available,
        })),
      };

      await api.put(`/admin/products/${id}`, dto);
      message.success(`Đã lưu biến thể #${idx + 1}`);
      
      variantSnapRef.current.delete(idx);
      setEditingIdxSet((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    } catch (error: any) {
      console.error("Save variant error:", error);
      message.error(error?.response?.data?.message || "Lỗi lưu biến thể");
    } finally {
      setSavingOneVariant(null);
    }
  };

  const duplicateVariant = (idx: number) => {
    if (variants.length >= MAX_VARIANTS) {
      message.warning(`Không thể thêm quá ${MAX_VARIANTS} biến thể`);
      return;
    }

    const source = variants[idx];
    
    // Validate source variant before duplicating
    const errors = validateVariant(source, idx);
    if (errors.length > 0) {
      Modal.confirm({
        title: "Biến thể nguồn có lỗi",
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>Biến thể bạn muốn nhân bản có các lỗi sau:</p>
            <ul style={{ color: "#ff4d4f", marginTop: 8 }}>
              {errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
            <p style={{ marginTop: 12 }}>Bạn có muốn tiếp tục nhân bản không?</p>
          </div>
        ),
        okText: "Nhân bản",
        cancelText: "Hủy",
        onOk: () => performDuplicate(idx),
      });
      return;
    }
    performDuplicate(idx);
  };

  const performDuplicate = (idx: number) => {
    const source = variants[idx];
    const newSku = generateSku();
    
    const clone: Variant = {
      id: undefined,
      size_id: source.size_id,
      color_id: source.color_id,
      sku: newSku,
      image: source.image,
      images: [...(source.images || [])],
      price: source.price,
      discount_price: source.discount_price,
      stock_quantity: source.stock_quantity,
      is_available: source.is_available,
      mainFiles: (source.mainFiles || []).map((f, k) => ({
        uid: `dup-main-${Date.now()}-${idx}-${k}`,
        name: f.name,
        status: "done" as const,
        url: f.url,
      })),
      albumFiles: (source.albumFiles || []).map((f, k) => ({
        uid: `dup-alb-${Date.now()}-${idx}-${k}`,
        name: f.name,
        status: "done" as const,
        url: f.url,
      })),
    };

    setVariants((prev) => {
      const newVariants = [...prev, clone];
      const newIndex = newVariants.length - 1;
      
      setTimeout(() => {
        setEditingIdxSet((prevSet) => {
          const next = new Set(prevSet);
          next.add(newIndex);
          return next;
        });
        if (newVariants[newIndex]) {
          try {
            const snapshot = JSON.parse(JSON.stringify(newVariants[newIndex]));
            variantSnapRef.current.set(newIndex, snapshot);
          } catch (error) {
            console.error('Failed to create variant snapshot:', error);
          }
        }
        setTimeout(() => {
          const variantCards = document.querySelectorAll('.variant-card');
          const newCard = variantCards[newIndex];
          if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            newCard.classList.add('variant-card-flash');
            setTimeout(() => {
              newCard.classList.remove('variant-card-flash');
            }, 1000);
          }
        }, 150);
      }, 100);
      
      return newVariants;
    });
    
    message.success(`Đã nhân bản biến thể #${idx + 1} → Biến thể mới có SKU: ${newSku}`);
  };

  const addVariant = () => {
    if (variants.length >= MAX_VARIANTS) {
      message.warning(`Không thể thêm quá ${MAX_VARIANTS} biến thể`);
      return;
    }

    const newVariant: Variant = {
      id: undefined,
      size_id: null,
      color_id: null,
      sku: generateSku(),
      image: "",
      images: [],
      price: "",
      discount_price: "",
      stock_quantity: 0,
      is_available: true,
      mainFiles: [],
      albumFiles: [],
    };

    // Add the new variant and immediately enter edit mode
    setVariants((prev) => {
      const newVariants = [...prev, newVariant];
      const newIndex = newVariants.length - 1;
      setTimeout(() => {
        setEditingIdxSet((prevSet) => {
          const next = new Set(prevSet);
          next.add(newIndex);
          return next;
        });
        
        if (newVariants[newIndex]) {
          try {
            const snapshot = JSON.parse(JSON.stringify(newVariants[newIndex]));
            variantSnapRef.current.set(newIndex, snapshot);
          } catch (error) {
            console.error('Failed to create variant snapshot:', error);
          }
        }
        
        // Scroll to the new variant card
        setTimeout(() => {
          const variantCards = document.querySelectorAll('.variant-card');
          const newCard = variantCards[newIndex];
          if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Add a subtle flash effect
            newCard.classList.add('variant-card-flash');
            setTimeout(() => {
              newCard.classList.remove('variant-card-flash');
            }, 1000);
          }
        }, 150);
      }, 100);
      
      return newVariants;
    });
    
    setVariationEnabled(true);
    message.success("Đã thêm biến thể mới - Sẵn sàng chỉnh sửa");
  };

  const removeVariant = (idx: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      icon: <ExclamationCircleOutlined />,
      content: `Bạn có chắc chắn muốn xóa biến thể #${idx + 1}?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        setVariants((prev) => prev.filter((_, i) => i !== idx));
        variantSnapRef.current.delete(idx);
        setEditingIdxSet((prev) => {
          const arr = Array.from(prev)
            .filter((i) => i !== idx)
            .map((i) => (i > idx ? i - 1 : i));
          return new Set(arr);
        });
        message.success("Đã xóa biến thể");
      },
    });
  };

  /* -------- Product Actions -------- */
  const onSaveProduct = async () => {
    try {
      setSavingProduct(true);
      const values = await formProduct.validateFields();

      // Validate all variants if variation is enabled
      if (variationEnabled && variants.length > 0) {
        const validation = validateAllVariants(variants);
        if (!validation.isValid) {
          Modal.error({
            title: "Lỗi validation biến thể",
            content: (
              <div style={{ maxHeight: "400px", overflow: "auto" }}>
                <ul style={{ color: "#ff4d4f", paddingLeft: 20 }}>
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            ),
          });
          return;
        }
      }

      const dto: any = {
        name: values.name,
        category_id:
          typeof values.category_id === "number"
            ? values.category_id
            : values.category_id
            ? Number(values.category_id)
            : null,
        description: values.description ?? null,
        sku: (values.sku && String(values.sku)) || "",
        origin: values.origin ?? null,
        brand: values.brand ?? null,
        image: productImage || null,
        variation_status: variationEnabled,
        ...(variationEnabled && variants.length > 0
          ? {
              variants: variants.map((v) => ({
                ...(typeof v.id === "number" ? { id: v.id } : {}),
                size_id: v.size_id,
                color_id: v.color_id,
                image: v.image || null,
                images: cleanseUrls(v.images || []),
                sku: v.sku || generateSku(),
                price: moneyToApiString(v.price),
                discount_price: moneyToApiString(v.discount_price),
                stock_quantity: Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0,
                is_available: !!v.is_available,
              })),
            }
          : {}),
      };

      await api.put(`/admin/products/${id}`, dto);
      message.success("Đã lưu thông tin sản phẩm thành công");
      
      setEditProduct(false);
      productSnapRef.current = { ...values };
      coverSnapRef.current = productImage;
    } catch (error: any) {
      console.error("Save product error:", error);
      message.error(error?.response?.data?.message || "Lỗi lưu thông tin sản phẩm");
    } finally {
      setSavingProduct(false);
    }
  };

  const onCancelProduct = () => {
    const snap = productSnapRef.current;
    if (snap) {
      formProduct.setFieldsValue(snap);
      setProductImage(coverSnapRef.current || "");
      setProductFiles(
        coverSnapRef.current
          ? [
              {
                uid: "cover-0",
                name: "cover",
                status: "done",
                url: toAssetUrl(coverSnapRef.current),
              } as UploadFile,
            ]
          : []
      );
    }
    setEditProduct(false);
  };

  /* -------- Preview Handler -------- */
  const handlePreview = async (file: UploadFile) => {
    let src = file.url;
    if (!src && file.originFileObj) {
      src = await getBase64(file.originFileObj as File);
    }
    if (!src && file.thumbUrl) {
      src = file.thumbUrl;
    }
    setPreviewSrc(src || "");
    setPreviewTitle(file.name || "Ảnh xem trước");
    setPreviewOpen(true);
  };

  /* -------- Render Guards -------- */
  if (!Number.isFinite(id)) return null;
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  /* -------- Render -------- */
  return (
    <div className="p-4">
      <Row gutter={[16, 16]}>
        {/* Header */}
        <Col span={24}>
          <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Title level={3} style={{ margin: 0 }}>
              Chi tiết sản phẩm #{id}
            </Title>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
          </Space>
        </Col>

        {/* Product Information Card */}
        <Col span={24}>
          <Card
            title="Thông tin sản phẩm"
            extra={
              !editProduct ? (
                <Button icon={<EditOutlined />} onClick={() => setEditProduct(true)}>
                  Sửa
                </Button>
              ) : (
                <Space>
                  <Button icon={<CloseOutlined />} onClick={onCancelProduct}>
                    Hủy
                  </Button>
                  <Button icon={<SaveOutlined />} type="primary" onClick={onSaveProduct} loading={savingProduct}>
                    Lưu
                  </Button>
                </Space>
              )
            }
          >
            <Form form={formProduct} layout="vertical" disabled={!editProduct}>
              <Row gutter={[16, 16]} align="top">
                {/* Product Image */}
                <Col xs={24} md={8}>
                  <Form.Item label="Ảnh đại diện sản phẩm">
                    <Upload
                      accept="image/*"
                      listType="picture-card"
                      maxCount={1}
                      beforeUpload={beforeUpload}
                      customRequest={productCustomRequest}
                      fileList={productFiles}
                      onChange={onChangeProductFiles}
                      onRemove={onRemoveProductFile}
                      onPreview={handlePreview}
                      showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                      className="upload-cover pretty-upload"
                      disabled={!editProduct}
                    >
                      {productFiles.length >= 1 ? null : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>Tải lên</div>
                        </div>
                      )}
                    </Upload>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Khuyến nghị: Ảnh vuông (1:1), tối thiểu 600×600px
                    </Text>
                  </Form.Item>
                </Col>

                {/* Product Details */}
                <Col xs={24} md={16}>
                  <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Tên sản phẩm" name="name" rules={[{ required: true, message: "Bắt buộc nhập tên" }]}>
                        <Input placeholder="VD: Giày Jordan 1 Retro High" allowClear maxLength={255} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="SKU sản phẩm" name="sku" tooltip="Mã định danh duy nhất (không thể chỉnh sửa)">
                        <Input {...noCopyProps} maxLength={20} placeholder="SKU tự động" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Danh mục" name="category_id" rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}>
                        <Select
                          showSearch
                          allowClear
                          placeholder="Chọn danh mục"
                          optionFilterProp="label"
                          options={categoryOptions}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item label="Xuất xứ" name="origin">
                        <Input placeholder="VD: USA" allowClear maxLength={100} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item label="Thương hiệu" name="brand">
                        <Input placeholder="VD: Nike" allowClear maxLength={100} />
                      </Form.Item>
                    </Col>

                    <Col span={24}>
                      <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={4} placeholder="Mô tả chi tiết sản phẩm..." maxLength={2000} showCount />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Variants Card */}
        <Col span={24}>
          <Card
            title={
              <Space>
                <Text strong>Biến thể</Text>
                <Tag color="blue">{variants.length}</Tag>
                <span style={{ marginLeft: 16 }} />
                <Text>Kích hoạt biến thể</Text>
                <Switch
                  checked={variationEnabled}
                  onChange={(checked) => {
                    if (!checked && variants.length > 0) {
                      Modal.confirm({
                        title: "Xác nhận tắt biến thể",
                        icon: <ExclamationCircleOutlined />,
                        content: "Tắt biến thể sẽ ẩn tất cả biến thể hiện tại. Bạn có chắc chắn?",
                        okText: "Tắt",
                        cancelText: "Hủy",
                        onOk: () => setVariationEnabled(false),
                      });
                    } else {
                      setVariationEnabled(checked);
                    }
                  }}
                />
              </Space>
            }
            extra={
              <Button icon={<PlusOutlined />} onClick={addVariant} disabled={!variationEnabled}>
                Thêm biến thể
              </Button>
            }
          >
            {variationEnabled ? (
              variants.length > 0 ? (
                <div className="variant-list">
                  {variants.map((variant, idx) => {
                    const isEditing = editingIdxSet.has(idx);
                    return (
                      <Card
                        key={variant.id ?? `variant-${idx}`}
                        className={`mb-3 variant-card ${isEditing ? 'variant-card-editing' : ''}`}
                        size="small"
                        title={
                          <Space>
                            <Text strong>Biến thể #{idx + 1}</Text>
                            {variant.sku ? <Tag color="blue">{variant.sku}</Tag> : null}
                            {variant.is_available ? (
                              <Tag color="green">Đang bán</Tag>
                            ) : (
                              <Tag color="red">Ngừng bán</Tag>
                            )}
                          </Space>
                        }
                        extra={
                          <Space>
                            {!isEditing ? (
                              <>
                                <Button size="small" icon={<CopyOutlined />} onClick={() => duplicateVariant(idx)}>
                                  Nhân bản
                                </Button>
                                <Button size="small" icon={<EditOutlined />} onClick={() => startEditVariant(idx)}>
                                  Sửa
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => removeVariant(idx)}
                                >
                                  Xóa
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="small" icon={<CloseOutlined />} onClick={() => cancelEditVariant(idx)}>
                                  Hủy
                                </Button>
                                <Button
                                  size="small"
                                  icon={<SaveOutlined />}
                                  type="primary"
                                  loading={savingOneVariant === idx}
                                  onClick={() => saveOneVariant(idx)}
                                >
                                  Lưu
                                </Button>
                              </>
                            )}
                          </Space>
                        }
                      >
                        <Row gutter={[16, 8]}>
                          {/* Variant Main Image */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Ảnh đại diện">
                                <Upload
                                  accept="image/*"
                                  listType="picture-card"
                                  maxCount={1}
                                  beforeUpload={beforeUpload}
                                  customRequest={variantMainCustomRequest(idx)}
                                  fileList={variant.mainFiles}
                                  onChange={({ file, fileList }) =>
                                    onChangeVariantMain(idx, file as UploadFile, fileList as UploadFile[])
                                  }
                                  onRemove={() => onRemoveVariantMain(idx)}
                                  onPreview={handlePreview}
                                  showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                                  className="upload-variant-main pretty-upload"
                                  disabled={!isEditing}
                                >
                                  {(variant.mainFiles?.length || 0) >= 1 ? null : (
                                    <div>
                                      <UploadOutlined />
                                      <div style={{ marginTop: 8, fontSize: 12 }}>Tải lên</div>
                                    </div>
                                  )}
                                </Upload>
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Size */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Size">
                                <Select
                                  allowClear
                                  showSearch
                                  placeholder="Chọn size"
                                  optionFilterProp="label"
                                  options={sizeOptions}
                                  value={variant.size_id ?? undefined}
                                  onChange={(val) => setVariant(idx, "size_id", (toNumberOrUndef(val) ?? null) as any)}
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Color */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Màu sắc">
                                <Select
                                  allowClear
                                  showSearch
                                  placeholder="Chọn màu"
                                  optionFilterProp="label"
                                  options={colorOptions}
                                  value={variant.color_id ?? undefined}
                                  onChange={(val) => setVariant(idx, "color_id", (toNumberOrUndef(val) ?? null) as any)}
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* SKU */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical">
                              <Form.Item label="SKU biến thể" tooltip="Mã định danh duy nhất (tự động)">
                                <Input {...noCopyProps} value={variant.sku} maxLength={20} />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Stock Quantity */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Tồn kho">
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  max={999999}
                                  value={variant.stock_quantity}
                                  onChange={(val) => setVariant(idx, "stock_quantity", Number(val) || 0)}
                                  placeholder="0"
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Price */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Giá bán" required>
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  max={999999999}
                                  value={Number(variant.price || 0)}
                                  onChange={(val) =>
                                    setVariant(idx, "price", val !== null && val !== undefined ? String(val) : "")
                                  }
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ""))}
                                  placeholder="0"
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Discount Price */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Giá khuyến mãi">
                                <InputNumber
                                  style={{ width: "100%" }}
                                  min={0}
                                  max={999999999}
                                  value={Number(variant.discount_price || 0)}
                                  onChange={(val) =>
                                    setVariant(idx, "discount_price", val !== null && val !== undefined ? String(val) : "")
                                  }
                                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ""))}
                                  placeholder="0"
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Status */}
                          <Col xs={24} sm={12} md={6}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Trạng thái bán">
                                <Switch
                                  checked={variant.is_available}
                                  onChange={(val) => setVariant(idx, "is_available", val)}
                                  checkedChildren="Bán"
                                  unCheckedChildren="Tắt"
                                />
                              </Form.Item>
                            </Form>
                          </Col>

                          {/* Album */}
                          <Col span={24}>
                            <Form layout="vertical" disabled={!isEditing}>
                              <Form.Item label="Album ảnh biến thể">
                                <Upload
                                  accept="image/*"
                                  listType="picture-card"
                                  multiple
                                  beforeUpload={beforeUpload}
                                  customRequest={variantAlbumCustomRequest(idx)}
                                  fileList={variant.albumFiles}
                                  onChange={({ file, fileList }) =>
                                    onChangeVariantAlbum(idx, file as UploadFile, fileList as UploadFile[])
                                  }
                                  onRemove={(file) => onRemoveVariantAlbum(idx, file as UploadFile)}
                                  onPreview={handlePreview}
                                  showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                                  className="upload-variant-album pretty-upload"
                                >
                                  <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8, fontSize: 12 }}>Tải lên</div>
                                  </div>
                                </Upload>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Bạn có thể tải lên nhiều ảnh cho album biến thể
                                </Text>
                              </Form.Item>
                            </Form>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Text type="secondary">Chưa có biến thể nào. Nhấn "Thêm biến thể" để bắt đầu.</Text>
                </div>
              )
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Text type="secondary">Biến thể đã bị tắt. Bật biến thể để quản lý các phiên bản sản phẩm.</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Preview Modal */}
      <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={() => setPreviewOpen(false)} width={900}>
        <img alt={previewTitle} src={previewSrc} style={{ width: "100%", maxHeight: "75vh", objectFit: "contain" }} />
      </Modal>

      {/* Styles */}
      <style>{`
        .upload-cover .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-cover .ant-upload.ant-upload-select-picture-card {
          width: 160px;
          height: 160px;
        }

        .upload-variant-main .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-variant-main .ant-upload.ant-upload-select-picture-card,
        .upload-variant-album .ant-upload-list-picture-card .ant-upload-list-item,
        .upload-variant-album .ant-upload.ant-upload-select-picture-card {
          width: 120px;
          height: 120px;
        }

        .pretty-upload .ant-upload-select,
        .pretty-upload .ant-upload-list-picture-card .ant-upload-list-item {
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }

        .pretty-upload .ant-upload.ant-upload-select-picture-card {
          border: 1px dashed #d9d9d9;
        }

        .pretty-upload .ant-upload.ant-upload-select-picture-card:hover {
          border-color: #1890ff;
          box-shadow: 0 4px 18px rgba(24, 144, 255, 0.15);
          transform: translateY(-2px);
        }

        .mb-3 {
          margin-bottom: 16px;
        }

        .variant-card {
          border-radius: 12px;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .variant-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .variant-card-editing {
          border: 2px solid #1890ff !important;
          box-shadow: 0 4px 20px rgba(24, 144, 255, 0.25) !important;
          background: linear-gradient(to bottom, #f0f7ff 0%, #ffffff 100%);
          animation: highlightBorder 0.5s ease-in-out;
        }

        @keyframes highlightBorder {
          0% {
            border-color: transparent;
            box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
          }
          50% {
            border-color: #40a9ff;
            box-shadow: 0 6px 24px rgba(24, 144, 255, 0.35);
          }
          100% {
            border-color: #1890ff;
            box-shadow: 0 4px 20px rgba(24, 144, 255, 0.25);
          }
        }

        .variant-card-editing .ant-card-head {
          background: linear-gradient(to right, #e6f7ff, #f0f7ff);
          border-bottom: 1px solid #91d5ff;
        }

        .variant-card-flash {
          animation: flashEffect 1s ease-in-out;
        }

        @keyframes flashEffect {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .variant-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ant-form-item {
          margin-bottom: 16px;
        }

        .ant-card-head {
          border-bottom: 1px solid #f0f0f0;
        }

        .ant-card-body {
          padding: 24px;
        }

        @media (max-width: 768px) {
          .ant-card-body {
            padding: 16px;
          }

          .upload-cover .ant-upload-list-picture-card .ant-upload-list-item,
          .upload-cover .ant-upload.ant-upload-select-picture-card {
            width: 120px;
            height: 120px;
          }

          .upload-variant-main .ant-upload-list-picture-card .ant-upload-list-item,
          .upload-variant-main .ant-upload.ant-upload-select-picture-card,
          .upload-variant-album .ant-upload-list-picture-card .ant-upload-list-item,
          .upload-variant-album .ant-upload.ant-upload-select-picture-card {
            width: 100px;
            height: 100px;
          }
        }
      `}</style>
    </div>
  );
}