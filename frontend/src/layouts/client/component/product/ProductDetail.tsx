import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { AxiosError } from "axios";
import {
  Row, Col, Card, Typography, Tag, Space, Image, Skeleton, Alert,
  Divider, Badge, InputNumber, Button, Breadcrumb, Tabs, Rate, message, Tooltip,
} from "antd";
import { useParams } from "react-router-dom";
import {
  ShoppingCartOutlined, HeartOutlined, HeartFilled, ShareAltOutlined,
  SafetyOutlined, TruckOutlined, SyncOutlined, CheckCircleOutlined,
  HomeOutlined, StarFilled, MinusOutlined, PlusOutlined,
} from "@ant-design/icons";
import {
  Product, fetchProduct, fetchCategories, parseImages,
} from "../../../../api/productApi";

const { Title, Text, Paragraph } = Typography;

// ============= CONSTANTS & UTILITIES =============
const getApiUrl = (): string => {
  const meta = (import.meta as any)?.env;
  return meta?.VITE_API_URL || meta?.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
};

const API_URL = getApiUrl();
const ASSET_BASE = API_URL.replace(/\/api\/?$/, "");

const toAssetUrl = (u?: string | null) =>
  !u ? undefined : /^https?:\/\//i.test(u) ? u : `${ASSET_BASE}/${u.replace(/^\/+/, "")}`;

const toNum = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toVND = (v: unknown) =>
  toNum(v) != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(toNum(v)!)
    : "—";

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));
const textOf = (x: any): string =>
  typeof x === "object" ? x?.value || x?.name || x?.label || String(x?.id ?? "") : String(x ?? "");

// ============= API FUNCTIONS =============
const getAuthToken = () => localStorage.getItem("access_token") || localStorage.getItem("token");

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

// ============= COMPONENT =============
const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [catMap, setCatMap] = useState<Record<number, string>>({});
  const [activeVariant, setActiveVariant] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>();
  const [quantity, setQty] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);

  // Load data
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
  }, [selectedColor, selectedSize, product]);

  // Images
  const productAlbum = useMemo(() => {
    if (!product) return [];
    return unique([toAssetUrl(product.image), ...parseImages(product.images).map(toAssetUrl)].filter(Boolean) as string[]);
  }, [product]);

  const variantAlbum = useMemo(() => {
    if (!activeVariant) return [];
    return unique([toAssetUrl(activeVariant.image), ...parseImages(activeVariant.images).map(toAssetUrl)].filter(Boolean) as string[]);
  }, [activeVariant]);

  const variantExists = !!activeVariant;
  const variantHasStock = activeVariant?.stock_quantity > 0;
  const albumUrls = !selectedColor && !selectedSize ? productAlbum
    : variantExists && variantHasStock ? variantAlbum : productAlbum;
  const showThumbnails = !selectedColor && !selectedSize ? true : variantExists && variantHasStock;
  const coverUrl = selectedImage ?? albumUrls[0];

  // Price & Stock
  const stock = variantHasStock ? activeVariant.stock_quantity : 0;
  const inStock = stock > 0;
  const basePrice = toNum(activeVariant?.price ?? product?.price);
  const salePrice = toNum(activeVariant?.discount_price ?? product?.discount_price ?? product?.price);
  const hasDiscount = basePrice && salePrice && salePrice < basePrice;
  const discountPercent = hasDiscount && basePrice ? Math.round(((basePrice - salePrice!) / basePrice) * 100) : null;

  useEffect(() => setSelectedImage(undefined), [activeVariant]);

  // Actions
  const validateQuantity = (value: number | null): boolean => {
    if (!value || value < 1) {
      message.warning("Số lượng phải lớn hơn 0");
      return false;
    }
    if (value > stock) {
      message.warning(`Số lượng không được vượt quá ${stock}`);
      return false;
    }
    return true;
  };

const handleAddToCart = async () => {
  if (!validateQuantity(quantity)) return;

  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/api/cart/add",
      {
        variant_id: activeVariant?.id,
        quantity: quantity,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("🛒 API Response:", response.data);
    message.success(response.data.message || "Đã thêm vào giỏ hàng!");
  } catch (error: unknown) {
    // ✅ Khai báo kiểu lỗi rõ ràng
    if (axios.isAxiosError(error)) {
      const err = error as AxiosError<{ message?: string }>;
      message.error(err.response?.data?.message || "Không thể thêm vào giỏ hàng");
      console.error("❌ Lỗi API:", err.response?.data);
    } else if (error instanceof Error) {
      message.error(error.message);
      console.error("❌ Lỗi khác:", error.message);
    } else {
      message.error("Lỗi không xác định");
      console.error("❌ Lỗi không xác định:", error);
    }
  }
};

  const handleBuyNow = () => {
    if (!validateQuantity(quantity)) return;
    console.log("💳 BUY_NOW", { product_id: product?.id, variant_id: activeVariant?.id, quantity, color: selectedColor, size: selectedSize });
  };

  const handleQuantityChange = (value: number | null) => {
    const newQty = value || 1;
    if (newQty > stock) {
      message.warning(`Chỉ còn ${stock} sản phẩm`);
      setQty(stock);
    } else if (newQty < 1) {
      setQty(1);
    } else {
      setQty(newQty);
    }
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

  // Render
  if (loading) {
    return (
      <div style={{ padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ padding: "16px 24px" }}>
        <Alert type="error" message={error ?? "Không tìm thấy sản phẩm"} />
      </div>
    );
  }

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
              <Image.PreviewGroup items={albumUrls}>
                <Badge.Ribbon text={discountPercent ? `-${discountPercent}%` : undefined} color="#ef4444" style={{ display: discountPercent ? "block" : "none", fontSize: 11 }}>
                  <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb" }}>
                    {coverUrl ? (
                      <Image src={coverUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ color: "#bbb", fontSize: 12 }}>Chưa có hình ảnh</div>
                    )}
                  </div>
                </Badge.Ribbon>

                {showThumbnails && albumUrls.length > 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(55px, 1fr))", gap: 8, marginTop: 10 }}>
                    {albumUrls.map((u, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(u)}
                        style={{ borderRadius: 4, overflow: "hidden", border: u === coverUrl ? "2px solid #3b82f6" : "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.2s", aspectRatio: "1/1" }}
                        onMouseEnter={(e) => { if (u !== coverUrl) e.currentTarget.style.borderColor = "#60a5fa"; }}
                        onMouseLeave={(e) => { if (u !== coverUrl) e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        <Image src={u} width="100%" height="100%" style={{ objectFit: "cover" }} preview={{ src: u }} />
                      </div>
                    ))}
                  </div>
                )}
              </Image.PreviewGroup>
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
                      <Rate disabled defaultValue={4.5} style={{ fontSize: 13 }} />
                      <Text strong style={{ color: "#f59e0b", fontSize: 13 }}>4.5</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>(128)</Text>
                    </Space>
                    <Divider type="vertical" style={{ margin: "0 4px" }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>Đã bán: 1.2k</Text>
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
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, display: "block", marginBottom: 2 }}>Giá bán</Text>
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

                {/* Stock */}

                <Divider style={{ margin: "4px 0" }} />

                {/* Quantity & Actions */}
                <div>
                  <Space direction="vertical" size={10} style={{ width: "100%" }}>
                    {/* Quantity Selector */}
                    <Space size={8}>
                      Số lượng:
                      <Button
                        size="middle"
                        icon={<MinusOutlined />}
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={!inStock || quantity <= 1}
                        style={{ width: 36, height: 36 }}
                      />
                      <InputNumber
                        min={1}
                        max={Math.max(1, stock)}
                        value={quantity}
                        onChange={handleQuantityChange}
                        disabled={!inStock}
                        controls={false}
                        style={{ width: 70, height: 36, textAlign: "center" }}
                      />
                      <Button
                        size="middle"
                        icon={<PlusOutlined />}
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={!inStock || quantity >= stock}
                        style={{ width: 36, height: 36 }}
                      />
                      <div>
                        {inStock ? (
                          <Space size={6}>
                            <CheckCircleOutlined style={{ color: "#10b981", fontSize: 14 }} />
                            <Text strong style={{ color: "#10b981", fontSize: 12 }}>Còn hàng ({stock})</Text>
                          </Space>
                        ) : (
                          <Tag color="red" style={{ fontSize: 12, padding: "4px 10px" }}>Tạm hết hàng</Tag>
                        )}
                      </div>
                    </Space>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <Button
                        type="primary"
                        size="middle"
                        icon={<ShoppingCartOutlined />}
                        onClick={handleAddToCart}
                        disabled={!inStock}
                        style={{
                          flex: 1,
                          height: 38,
                          fontSize: 13,
                          fontWeight: "600",
                          borderRadius: 6,
                        }}
                      >
                        Thêm vào giỏ
                      </Button>
                      <Button
                        size="middle"
                        onClick={handleBuyNow}
                        disabled={!inStock}
                        style={{
                          flex: 1,
                          height: 38,
                          fontSize: 13,
                          fontWeight: "600",
                          borderRadius: 6,
                          background: inStock ? "#10b981" : undefined,
                          color: inStock ? "#fff" : undefined,
                          borderColor: inStock ? "#10b981" : undefined,
                        }}
                      >
                        Mua ngay
                      </Button>
                    </div>

                  </Space>
                </div>
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
                    label: <span style={{ fontSize: 13 }}>Đánh giá (128)</span>,
                    children: (
                      <div style={{ textAlign: "center", padding: "30px 0" }}>
                        <StarFilled style={{ fontSize: 36, color: "#f59e0b" }} />
                        <Title level={5} style={{ marginTop: 12, fontSize: 14 }}>Chưa có đánh giá</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>Hãy là người đầu tiên đánh giá</Text>
                      </div>
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