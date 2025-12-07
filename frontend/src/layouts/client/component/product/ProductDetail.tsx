import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Row, Col, Card, Typography, Tag, Space, Image, Skeleton, Alert,
  Divider, Badge, InputNumber, Button, Breadcrumb, Tabs, Rate, message, Tooltip,
  Pagination, Progress,
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShoppingCartOutlined, HeartOutlined, HeartFilled,
  SafetyOutlined, TruckOutlined, SyncOutlined, CheckCircleOutlined,
  HomeOutlined, StarFilled, MinusOutlined, PlusOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

// ============= TYPES =============
interface Variant {
  id: number;
  sku?: string;
  image?: string;
  images?: string | string[];
  price: number;
  discount_price?: number;
  stock_quantity: number;
  quantity_sold?: number;
  size?: string | { value?: string; name?: string; label?: string; id?: number };
  color?: string | { value?: string; name?: string; label?: string; id?: number };
}

interface Product {
  id: number;
  name: string;
  description?: string;
  image?: string;
  images?: string | string[];
  price: number;
  discount_price?: number;
  category_id?: number;
  brand?: string;
  origin?: string;
  variants?: Variant[];
}

interface Category {
  id: number;
  name: string;
}

interface User {
  name?: string;
}

interface ReviewReply {
  id: number;
  comment: string;
  comment_time: string;
}

interface Review {
  id: number;
  rating: number;
  comment?: string;
  comment_time: string;
  user?: User;
  children?: ReviewReply[];
}

interface ReviewStats {
  total: number;
  average: number;
  distribution: { [key: number]: number };
}

// ============= CONSTANTS & UTILITIES =============
const getApiUrl = (): string => {
  const meta = (import.meta as any)?.env;
  return meta?.VITE_API_URL || meta?.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
};

const API_URL = getApiUrl();
const ASSET_BASE = API_URL.replace(/\/api\/?$/, "");

const toAssetUrl = (u: string | undefined): string | undefined =>
  !u ? undefined : /^https?:\/\//i.test(u) ? u : `${ASSET_BASE}/${u.replace(/^\/+/, "")}`;

const toNum = (v: any): number | null => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toVND = (v: any): string => {
  const num = toNum(v);
  return num != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num)
    : "—";
};

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

const textOf = (x: any): string =>
  typeof x === "object" ? x?.value || x?.name || x?.label || String(x?.id ?? "") : String(x ?? "");

// ============= API FUNCTIONS =============
const getAuthToken = (): string | null => 
  localStorage.getItem("access_token") || localStorage.getItem("token");

const parseImages = (imgs: string | string[] | undefined): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs.filter(Boolean);
  try {
    const parsed = JSON.parse(imgs);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [imgs];
  } catch {
    return [imgs];
  }
};

const fetchProduct = async (id: number): Promise<Product> => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await axios.get(`${API_URL}/admin/products/${id}`, { headers });
  return data?.data ?? data;
};

const fetchCategories = async (): Promise<Category[]> => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const { data } = await axios.get(`${API_URL}/admin/categories`, { headers });
  const unwrap = (resData: any): Category[] => {
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData?.data)) return resData.data;
    if (Array.isArray(resData?.data?.data)) return resData.data.data;
    return [];
  };
  return unwrap(data);
};

const likeProduct = async (productId: number): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) {
      message.warning("Vui lòng đăng nhập để thêm sản phẩm yêu thích");
      return false;
    }
    const res = await fetch(`${API_URL}/products/${productId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.ok) {
      message.success("Đã thêm vào danh sách yêu thích");
      return true;
    }
    if (res.status === 401) message.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
    else message.error("Không thể thêm vào danh sách yêu thích");
    return false;
  } catch (error) {
    console.error("Error liking product:", error);
    message.error("Có lỗi xảy ra");
    return false;
  }
};

const unlikeProduct = async (productId: number): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;
    const res = await fetch(`${API_URL}/products/${productId}/unlike`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.ok) {
      message.info("Đã xóa khỏi danh sách yêu thích");
      return true;
    }
    message.error("Không thể xóa khỏi danh sách yêu thích");
    return false;
  } catch (error) {
    console.error("Error unliking product:", error);
    message.error("Có lỗi xảy ra");
    return false;
  }
};

const checkIsLiked = async (productId: number): Promise<boolean> => {
  try {
    const token = getAuthToken();
    if (!token) return false;
    const res = await fetch(`${API_URL}/products/${productId}/is-liked`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.liked ?? data?.is_liked ?? data?.isLiked);
    }
    return false;
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
};

const fetchProductReviews = async (productId: number): Promise<Review[]> => {
  try {
    const res = await fetch(`${API_URL}/products/${productId}/reviews`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const reviewData = data.data.data || data.data;
        return Array.isArray(reviewData) ? reviewData : [];
      }
    }
    return [];
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
};

// ============= COMPONENT =============
const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [catMap, setCatMap] = useState<{ [key: number]: string }>({});
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | undefined>();
  const [quantity, setQty] = useState(1);
  const [quantityError, setQuantityError] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;

  // Load product data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cats, prod] = await Promise.all([
          fetchCategories(),
          fetchProduct(Number(id))
        ]);
        setCatMap(Object.fromEntries(cats.map((c) => [c.id, c.name])));
        setProduct(prod);
        const liked = await checkIsLiked(Number(id));
        setIsWishlisted(liked);
      } catch (e) {
        console.error(e);
        setError("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      if (!id) return;
      setReviewsLoading(true);
      const reviewsData = await fetchProductReviews(Number(id));
      setReviews(reviewsData);
      setReviewsLoading(false);
    };
    loadReviews();
  }, [id]);

  // Calculate review statistics
  const reviewStats = useMemo((): ReviewStats => {
    if (reviews.length === 0) return { 
      total: 0, 
      average: 0, 
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } 
    };
    
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const average = sum / total;
    
    const distribution = reviews.reduce((acc, r) => {
      const rating = r.rating || 0;
      if (rating >= 1 && rating <= 5) {
        acc[rating] = (acc[rating] || 0) + 1;
      }
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as { [key: number]: number });
    
    return { total, average, distribution };
  }, [reviews]);

  // Paginated reviews
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * reviewsPerPage;
    const endIndex = startIndex + reviewsPerPage;
    return reviews.slice(startIndex, endIndex);
  }, [reviews, currentPage]);

  // Variants
  const allSizes = unique((product?.variants ?? []).map((v) => textOf(v.size)).filter(Boolean));
  const allColors = unique((product?.variants ?? []).map((v) => textOf(v.color)).filter(Boolean));

  useEffect(() => {
    if (!product) return;
    const found = product.variants?.find(
      (v) =>
        (!selectedColor || textOf(v.color) === selectedColor) &&
        (!selectedSize || textOf(v.size) === selectedSize)
    ) ?? null;
    setActiveVariant(found);
    setQty(1);
    setQuantityError("");
  }, [selectedColor, selectedSize, product]);

  // Kiểm tra xem đã chọn đủ biến thể chưa
  const hasVariantOptions = allColors.length > 0 || allSizes.length > 0;
  const variantSelected = !hasVariantOptions || (
    (!allColors.length || selectedColor) && 
    (!allSizes.length || selectedSize)
  );

  // Images
  const productAlbum = useMemo(() => {
    if (!product) return [];
    return unique([toAssetUrl(product.image), ...parseImages(product.images).map(toAssetUrl)].filter(Boolean) as string[]);
  }, [product]);

  const variantAlbum = useMemo(() => {
    if (!activeVariant) return [];
    return unique([toAssetUrl(activeVariant.image), ...parseImages(activeVariant.images).map(toAssetUrl)].filter(Boolean) as string[]);
  }, [activeVariant]);

  const mainImage = useMemo(() => {
    if (variantSelected && variantAlbum.length > 0) {
      return variantAlbum[0];
    }
    return productAlbum[0];
  }, [variantSelected, variantAlbum, productAlbum]);

  const allThumbnails = useMemo(() => {
    return unique([...productAlbum, ...variantAlbum]);
  }, [productAlbum, variantAlbum]);

  const coverUrl = selectedImage ?? mainImage;

  // Price & Stock
  const stock = activeVariant ? activeVariant.stock_quantity : 0;
  
  const lowestPrice = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return null;
    }
    const prices = product.variants
      .map(v => toNum(v.discount_price ?? v.price))
      .filter((p): p is number => p !== null);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [product]);

  const displayPrice = useMemo(() => {
    if (variantSelected && activeVariant) {
      return toNum(activeVariant.discount_price ?? activeVariant.price);
    }
    return lowestPrice ?? toNum(product?.price);
  }, [variantSelected, activeVariant, lowestPrice, product]);

  const basePrice = useMemo(() => {
    if (variantSelected && activeVariant) {
      return toNum(activeVariant.price);
    }
    if (product?.variants && product.variants.length > 0) {
      const prices = product.variants
        .map(v => toNum(v.price))
        .filter((p): p is number => p !== null);
      return prices.length > 0 ? Math.max(...prices) : null;
    }
    return toNum(product?.price);
  }, [variantSelected, activeVariant, product]);

  const salePrice = displayPrice;
  const hasDiscount = basePrice && salePrice && salePrice < basePrice;
  const discountPercent = hasDiscount && basePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null;
  
  const totalSold = product?.variants?.reduce((sum, v) => sum + (v.quantity_sold || 0), 0) || 0;

  useEffect(() => setSelectedImage(undefined), [activeVariant]);

  // ========== VALIDATION REALTIME ==========
  const handleQuantityChange = (value: number | null) => {
    // Cho phép xóa mà không báo lỗi
    if (value === null || value === undefined) {
      setQty(0);
      setQuantityError("");
      return;
    }
    
    setQty(value);
    
    // Cho phép số 0 mà không báo lỗi (đang nhập)
    if (value === 0) {
      setQuantityError("");
      return;
    }
    
    // Kiểm tra số âm
    if (value < 0) {
      setQuantityError("Bạn không được nhập số âm");
      return;
    }
    
    // Kiểm tra vượt quá stock
    if (activeVariant && value > activeVariant.stock_quantity) {
      setQuantityError(`Bạn đã nhập quá số lượng sản phẩm (còn ${activeVariant.stock_quantity})`);
      return;
    }
    
    // Không có lỗi
    setQuantityError("");
  };

  // Validation Functions
  const validateSelection = (): boolean => {
    const hasColorOptions = allColors.length > 0;
    const hasSizeOptions = allSizes.length > 0;

    if (hasColorOptions && !selectedColor) {
      message.warning("Vui lòng chọn màu sắc");
      return false;
    }

    if (hasSizeOptions && !selectedSize) {
      message.warning("Vui lòng chọn kích thước");
      return false;
    }

    if ((hasColorOptions || hasSizeOptions) && !activeVariant) {
      message.warning("Vui lòng chọn đầy đủ thông tin sản phẩm");
      return false;
    }

    return true;
  };

  const validateQuantity = (value: number): boolean => {
    if (!value || value < 1) {
      message.warning("Vui lòng nhập số lượng hợp lệ");
      return false;
    }
    if (activeVariant && value > activeVariant.stock_quantity) {
      message.warning(`Số lượng không được vượt quá ${activeVariant.stock_quantity}`);
      return false;
    }
    return true;
  };

  // Action Handlers
  const handleAddToCart = async () => {
    if (!validateSelection()) return;
    if (!validateQuantity(quantity)) return;

    try {
      const response = await axios.post(
        `${API_URL}/cart/add`,
        {
          variant_id: activeVariant?.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      message.success(response.data.message || "Đã thêm vào giỏ hàng!");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        message.error(error.response?.data?.message || "Không thể thêm vào giỏ hàng");
      } else {
        message.error("Lỗi không xác định");
      }
    }
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;
    if (!validateQuantity(quantity)) return;
    if (!activeVariant || !product) return;

    const selectedProduct = {
      id: Date.now(),
      quantity: quantity,
      variant: {
        id: activeVariant.id,
        sku: activeVariant.sku || "",
        image: activeVariant.image,
        price: activeVariant.price,
        discount_price: activeVariant.discount_price,
        stock_quantity: activeVariant.stock_quantity,
        quantity_sold: activeVariant.quantity_sold,
        product: {
          id: product.id,
          name: product.name,
        },
        color: {
          type: "color",
          value: selectedColor || "",
        },
        size: {
          type: "size",
          value: selectedSize || "",
        },
      },
    };

    localStorage.setItem("selectedCartItems", JSON.stringify([selectedProduct]));
    const total = quantity * parseFloat(String(activeVariant.discount_price || activeVariant.price || "0"));
    localStorage.setItem("cartTotal", total.toString());
    navigate("/checkout");
  };

  const handleToggleWishlist = async () => {
    if (likingInProgress || !product) return;
    setLikingInProgress(true);
    try {
      if (isWishlisted) {
        const success = await unlikeProduct(product.id);
        if (success) setIsWishlisted(false);
      } else {
        const success = await likeProduct(product.id);
        if (success) setIsWishlisted(true);
      }
    } finally {
      setLikingInProgress(false);
    }
  };

  // Render Loading
  if (loading) {
    return (
      <div style={{ padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  // Render Error
  if (error || !product) {
    return (
      <div style={{ padding: "16px 24px" }}>
        <Alert type="error" message={error ?? "Không tìm thấy sản phẩm"} />
      </div>
    );
  }

  // Main Render
  return (
    <div style={{ background: "#f8f9fa", minHeight: "100vh", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ background: "#fff", padding: "10px 24px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Breadcrumb
            items={[
              { href: "/", title: <HomeOutlined style={{ fontSize: 12 }} /> },
              { href: "/products", title: <span style={{ fontSize: 12 }}>Sản phẩm</span> },
              { title: <span style={{ fontSize: 12 }}>{product.name}</span> },
            ]}
          />
        </div>
      </div>

      <div style={{ padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <Row gutter={[16, 16]}>
          {/* Left Column - Images */}
          <Col xs={24} lg={9}>
            <Card variant="outlined" styles={{ body: { padding: 12 } }} style={{ borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Badge.Ribbon text={discountPercent ? `-${discountPercent}%` : undefined} color="#ef4444" style={{ display: discountPercent ? "block" : "none", fontSize: 11 }}>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb" }}>
                  {coverUrl ? (
                    <Image src={coverUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} preview={false} />
                  ) : (
                    <div style={{ color: "#bbb", fontSize: 12 }}>Chưa có hình ảnh</div>
                  )}
                </div>
              </Badge.Ribbon>

              {allThumbnails.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 8, marginTop: 12 }}>
                  {allThumbnails.map((u, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(u)}
                      style={{ 
                        borderRadius: 4, 
                        overflow: "hidden", 
                        border: u === coverUrl ? "2px solid #3b82f6" : "1px solid #e5e7eb", 
                        cursor: "pointer", 
                        transition: "all 0.2s", 
                        aspectRatio: "1/1" 
                      }}
                      onMouseEnter={(e) => { if (u !== coverUrl) e.currentTarget.style.borderColor = "#60a5fa"; }}
                      onMouseLeave={(e) => { if (u !== coverUrl) e.currentTarget.style.borderColor = "#e5e7eb"; }}
                    >
                      <img src={u} alt={`Thumbnail ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Services */}
            <Card variant="outlined" style={{ marginTop: 12, borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }} styles={{ body: { padding: 12 } }}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space size={8}><SafetyOutlined style={{ fontSize: 16, color: "#10b981" }} /><Text style={{ fontSize: 12 }}>Đảm bảo hàng chính hãng</Text></Space>
                <Space size={8}><TruckOutlined style={{ fontSize: 16, color: "#3b82f6" }} /><Text style={{ fontSize: 12 }}>Miễn phí vận chuyển từ 500k</Text></Space>
                <Space size={8}><SyncOutlined style={{ fontSize: 16, color: "#f59e0b" }} /><Text style={{ fontSize: 12 }}>Đổi trả trong 30 ngày</Text></Space>
              </Space>
            </Card>
          </Col>

          {/* Right Column - Info */}
          <Col xs={24} lg={15}>
            <Card variant="outlined" styles={{ body: { padding: 16 } }} style={{ borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                {/* Title & Tags */}
                <div>
                  <Space wrap size={[6, 6]} style={{ marginBottom: 8 }}>
                    <Tag color="blue" style={{ fontSize: 11, padding: "2px 8px" }}>{catMap[product.category_id ?? 0] ?? "Không phân loại"}</Tag>
                    {product.brand && <Tag color="purple" style={{ fontSize: 11, padding: "2px 8px" }}>{product.brand}</Tag>}
                    {product.origin && <Tag color="cyan" style={{ fontSize: 11, padding: "2px 8px" }}>{product.origin}</Tag>}
                    <Tag icon={<CheckCircleOutlined style={{ fontSize: 10 }} />} color="success" style={{ fontSize: 11, padding: "2px 8px" }}>Chính hãng</Tag>
                  </Space>
                  <Title level={3} style={{ marginBottom: 8, fontSize: 20, fontWeight: 700, color: "#1f2937" }}>{product.name}</Title>
                  <Space size="middle" wrap>
                    <Space size={4}>
                      <Rate disabled value={reviewStats.average} allowHalf style={{ fontSize: 13 }} />
                      <Text strong style={{ color: "#f59e0b", fontSize: 13 }}>
                        {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : "Chưa có"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>({reviewStats.total})</Text>
                    </Space>
                    <Divider type="vertical" style={{ margin: "0 4px" }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>Đã bán: {totalSold}</Text>
                    <Tooltip title={isWishlisted ? "Bỏ yêu thích" : "Yêu thích"}>
                      <Button
                        type="text"
                        size="small"
                        icon={isWishlisted ? <HeartFilled /> : <HeartOutlined />}
                        onClick={handleToggleWishlist}
                        loading={likingInProgress}
                        style={{ color: isWishlisted ? "#ef4444" : "#6b7280", fontSize: 16, padding: "4px 8px" }}
                      />
                    </Tooltip>
                  </Space>
                </div>

                <Divider style={{ margin: "4px 0" }} />

                {/* Price */}
                <div style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", padding: "14px 16px", borderRadius: 8 }}>
                  <Space align="center" size="middle">
                    <div>
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, display: "block", marginBottom: 2 }}>
                        {!variantSelected && hasVariantOptions ? "Giá từ" : "Giá bán"}
                      </Text>
                      <Title level={2} style={{ margin: 0, color: "#fff", fontSize: 26, fontWeight: 700 }}>{toVND(salePrice)}</Title>
                    </div>
                    {hasDiscount && basePrice && (
                      <Space direction="vertical" size={2}>
                        <Text delete style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{toVND(basePrice)}</Text>
                        <Tag color="red" style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, fontWeight: "bold" }}>-{discountPercent}%</Tag>
                      </Space>
                    )}
                  </Space>
                </div>

                {/* Color Selection */}
                {allColors.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                      Màu sắc: {selectedColor && <Text type="secondary" style={{ fontWeight: "normal", marginLeft: 6, fontSize: 12 }}>{selectedColor}</Text>}
                    </Text>
                    <Space wrap size={8}>
                      {allColors.map((c) => (
                        <Button
                          key={c}
                          size="middle"
                          type={c === selectedColor ? "primary" : "default"}
                          onClick={() => setSelectedColor(c)}
                          style={{ minWidth: 70, height: 36, borderRadius: 6, fontSize: 12 }}
                        >
                          {c}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Size Selection */}
                {allSizes.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                      Kích thước: {selectedSize && <Text type="secondary" style={{ fontWeight: "normal", marginLeft: 6, fontSize: 12 }}>{selectedSize}</Text>}
                    </Text>
                    <Space wrap size={8}>
                      {allSizes.map((s) => (
                        <Button
                          key={s}
                          size="middle"
                          type={s === selectedSize ? "primary" : "default"}
                          onClick={() => setSelectedSize(s)}
                          style={{ minWidth: 60, height: 36, borderRadius: 6, fontSize: 12 }}
                        >
                          {s}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

                <Divider style={{ margin: "4px 0" }} />

                {/* Quantity & Actions */}
                {variantSelected ? (
                  <div>
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      {/* Stock Status */}
                      <div>
                        {stock > 0 ? (
                          <Space size={6}>
                            <CheckCircleOutlined style={{ color: "#10b981", fontSize: 14 }} />
                            <Text strong style={{ color: "#10b981", fontSize: 13 }}>Còn hàng ({stock} sản phẩm)</Text>
                          </Space>
                        ) : (
                          <Tag color="red" style={{ fontSize: 12, padding: "4px 10px" }}>Tạm hết hàng</Tag>
                        )}
                      </div>

                      {/* Quantity Selector */}
                      {stock > 0 && (
                        <div>
                          <Space size={8} style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 13 }}>Số lượng:</Text>
                            <Button
                              size="middle"
                              icon={<MinusOutlined />}
                              onClick={() => handleQuantityChange(quantity - 1)}
                              disabled={quantity <= 1}
                              style={{ width: 36, height: 36 }}
                            />
                            <InputNumber
                              value={quantity}
                              onChange={handleQuantityChange}
                              controls={false}
                              status={quantityError ? "error" : ""}
                              style={{ width: 70, height: 36, textAlign: "center" }}
                            />
                            <Button
                              size="middle"
                              icon={<PlusOutlined />}
                              onClick={() => handleQuantityChange(quantity + 1)}
                              disabled={quantity >= stock}
                              style={{ width: 36, height: 36 }}
                            />
                          </Space>
                          {quantityError && (
                            <Text type="danger" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                              {quantityError}
                            </Text>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <Button
                          type="primary"
                          size="large"
                          icon={<ShoppingCartOutlined />}
                          onClick={handleAddToCart}
                          disabled={stock === 0 || !!quantityError}
                          style={{
                            flex: 1,
                            height: 42,
                            fontSize: 14,
                            fontWeight: "600",
                            borderRadius: 6,
                          }}
                        >
                          Thêm vào giỏ
                        </Button>
                        <Button
                          size="large"
                          onClick={handleBuyNow}
                          disabled={stock === 0 || !!quantityError}
                          style={{
                            flex: 1,
                            height: 42,
                            fontSize: 14,
                            fontWeight: "600",
                            borderRadius: 6,
                            background: stock > 0 && !quantityError ? "#10b981" : undefined,
                            color: stock > 0 && !quantityError ? "#fff" : undefined,
                            borderColor: stock > 0 && !quantityError ? "#10b981" : undefined,
                          }}
                        >
                          Mua ngay
                        </Button>
                      </div>
                    </Space>
                  </div>
                ) : (
                  <div>
                    {/* Nút bị disable khi chưa chọn biến thể */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ShoppingCartOutlined />}
                        disabled
                        style={{
                          flex: 1,
                          height: 42,
                          fontSize: 14,
                          fontWeight: "600",
                          borderRadius: 6,
                        }}
                      >
                        Thêm vào giỏ
                      </Button>
                      <Button
                        size="large"
                        disabled
                        style={{
                          flex: 1,
                          height: 42,
                          fontSize: 14,
                          fontWeight: "600",
                          borderRadius: 6,
                        }}
                      >
                        Mua ngay
                      </Button>
                    </div>
                  </div>
                )}
              </Space>
            </Card>

            {/* Details Tabs */}
            <Card variant="outlined" style={{ marginTop: 16, borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }} styles={{ body: { padding: 12 } }}>
              <Tabs
                defaultActiveKey="1"
                size="small"
                items={[
                  {
                    key: "1",
                    label: <span style={{ fontSize: 13 }}>Mô tả</span>,
                    children: <Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, color: "#4b5563", margin: 0 }}>{product.description || "Chưa có mô tả chi tiết"}</Paragraph>,
                  },
                  {
                    key: "2",
                    label: <span style={{ fontSize: 13 }}>Thông số</span>,
                    children: (
                      <Space direction="vertical" size={10} style={{ width: "100%" }}>
                        <Row><Col span={7}><Text strong style={{ fontSize: 12 }}>Danh mục:</Text></Col><Col span={17}><Text style={{ fontSize: 12 }}>{catMap[product.category_id ?? 0] ?? "Không phân loại"}</Text></Col></Row>
                        {product.brand && <Row><Col span={7}><Text strong style={{ fontSize: 12 }}>Thương hiệu:</Text></Col><Col span={17}><Text style={{ fontSize: 12 }}>{product.brand}</Text></Col></Row>}
                        {product.origin && <Row><Col span={7}><Text strong style={{ fontSize: 12 }}>Xuất xứ:</Text></Col><Col span={17}><Text style={{ fontSize: 12 }}>{product.origin}</Text></Col></Row>}
                      </Space>
                    ),
                  },
                  {
                    key: "3",
                    label: <span style={{ fontSize: 13 }}>Đánh giá ({reviewStats.total})</span>,
                    children: reviewsLoading ? (
                      <div style={{ padding: "20px 0" }}>
                        <Skeleton active paragraph={{ rows: 3 }} />
                      </div>
                    ) : reviews.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px" }}>
                        <StarFilled style={{ fontSize: 48, color: "#d1d5db", marginBottom: 16 }} />
                        <Title level={5} style={{ margin: "8px 0", fontSize: 15, color: "#6b7280" }}>Chưa có đánh giá</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>Hãy là người đầu tiên đánh giá sản phẩm này</Text>
                      </div>
                    ) : (
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        {/* Review Statistics */}
                        <Row gutter={16}>
                          <Col xs={24} sm={10}>
                            <div style={{ 
                              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", 
                              padding: "20px", 
                              borderRadius: 12, 
                              textAlign: "center",
                              border: "1px solid #fcd34d",
                              height: "100%"
                            }}>
                              <Title level={1} style={{ margin: "0 0 4px 0", color: "#b45309", fontSize: 52, fontWeight: 700 }}>
                                {reviewStats.average.toFixed(1)}
                              </Title>
                              <Rate 
                                disabled 
                                value={reviewStats.average} 
                                allowHalf 
                                style={{ fontSize: 18, color: "#f59e0b" }} 
                              />
                              <div style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 13, color: "#78350f", fontWeight: 500 }}>
                                  {reviewStats.total} đánh giá
                                </Text>
                              </div>
                            </div>
                          </Col>

                          <Col xs={24} sm={14}>
                            <div style={{ padding: "8px 0" }}>
                              {[5, 4, 3, 2, 1].map((star) => {
                                const count = reviewStats.distribution[star] || 0;
                                const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                                return (
                                  <Row key={star} align="middle" gutter={8} style={{ marginBottom: 8 }}>
                                    <Col flex="none">
                                      <Space size={2} style={{ minWidth: 60 }}>
                                        <Text strong style={{ fontSize: 12 }}>{star}</Text>
                                        <StarFilled style={{ fontSize: 12, color: "#f59e0b" }} />
                                      </Space>
                                    </Col>
                                    <Col flex="auto">
                                      <Progress 
                                        percent={percentage} 
                                        showInfo={false} 
                                        strokeColor="#f59e0b"
                                        trailColor="#e5e7eb"
                                        size="small"
                                      />
                                    </Col>
                                    <Col flex="none">
                                      <Text type="secondary" style={{ fontSize: 12, minWidth: 30, display: "inline-block", textAlign: "right" }}>
                                        {count}
                                      </Text>
                                    </Col>
                                  </Row>
                                );
                              })}
                            </div>
                          </Col>
                        </Row>

                        <Divider style={{ margin: "8px 0" }} />

                        {/* Reviews List */}
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                          {paginatedReviews.map((review) => (
                            <Card 
                              key={review.id} 
                              size="small" 
                              style={{ 
                                background: "#f9fafb", 
                                borderRadius: 8,
                                border: "1px solid #e5e7eb"
                              }}
                              styles={{ body: { padding: 14 } }}
                            >
                              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <Space size={10}>
                                    <div style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: "50%",
                                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#fff",
                                      fontSize: 15,
                                      fontWeight: 600,
                                      flexShrink: 0
                                    }}>
                                      {(review.user?.name || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.4 }}>
                                        {review.user?.name || "Người dùng ẩn danh"}
                                      </Text>
                                      <Space size={8} style={{ marginTop: 2 }}>
                                        <Rate 
                                          disabled 
                                          value={review.rating} 
                                          style={{ fontSize: 13, color: "#f59e0b" }} 
                                        />
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                          {new Date(review.comment_time).toLocaleDateString("vi-VN")}
                                        </Text>
                                      </Space>
                                    </div>
                                  </Space>
                                </div>

                                {review.comment && (
                                  <Text 
                                    style={{ 
                                      fontSize: 13, 
                                      lineHeight: 1.6,
                                      color: "#374151",
                                      display: "block",
                                      whiteSpace: "pre-wrap",
                                      marginTop: 4
                                    }}
                                  >
                                    {review.comment}
                                  </Text>
                                )}
                                
                                {review.children && review.children.length > 0 && (
                                  <div style={{ 
                                    marginTop: 10, 
                                    background: "#eff6ff",
                                    padding: 12,
                                    borderRadius: 6,
                                    borderLeft: "3px solid #3b82f6"
                                  }}>
                                    {review.children.map((reply) => (
                                      <Space key={reply.id} direction="vertical" size={4} style={{ width: "100%" }}>
                                        <Space size={6}>
                                          <Tag color="blue" style={{ fontSize: 10, fontWeight: 600, margin: 0 }}>
                                            Shop
                                          </Tag>
                                          <Text type="secondary" style={{ fontSize: 11 }}>
                                            {new Date(reply.comment_time).toLocaleDateString("vi-VN")}
                                          </Text>
                                        </Space>
                                        <Text style={{ 
                                          fontSize: 12, 
                                          color: "#1e40af",
                                          lineHeight: 1.6,
                                          display: "block",
                                          whiteSpace: "pre-wrap"
                                        }}>
                                          {reply.comment}
                                        </Text>
                                      </Space>
                                    ))}
                                  </div>
                                )}
                              </Space>
                            </Card>
                          ))}
                        </Space>

                        {reviews.length > reviewsPerPage && (
                          <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                            <Pagination
                              current={currentPage}
                              total={reviews.length}
                              pageSize={reviewsPerPage}
                              onChange={(page) => setCurrentPage(page)}
                              showSizeChanger={false}
                              size="small"
                            />
                          </div>
                        )}
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ProductDetail;