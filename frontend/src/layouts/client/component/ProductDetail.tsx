import React, { useEffect, useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Typography,
  Tag,
  Space,
  Image,
  Skeleton,
  Alert,
  Divider,
  Badge,
  InputNumber,
  Button,
} from "antd";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Product,
  fetchProduct,
  fetchCategories,
  parseImages,
} from "../../../api/productApi";

const { Title, Text, Paragraph } = Typography;

/* ---------- Asset URL ---------- */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";
const ASSET_BASE = String(API_URL).replace(/\/api\/?$/, "");

const toAssetUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${ASSET_BASE}/${String(u).replace(/^\/+/, "")}`;
};
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

/* ---------- Ép số + VND ---------- */
const toNum = (x: unknown): number | null => {
  if (x === null || x === undefined) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  const n = Number(String(x).replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(n) ? n : null;
};
const vnd = (x: unknown) =>
  toNum(x) != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
        toNum(x) as number
      )
    : "—";

/* ---------- Helpers (size/color/SKU/stock) ---------- */
const attrText = (x: any): string => {
  if (!x) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object") {
    return x.value || x.name || x.label || x.text || String(x.id || "");
  }
  return String(x);
};
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const sizesOf = (p: any): string[] => {
  const a = Array.isArray(p?.sizes) ? p.sizes.map(attrText) : [];
  const b = Array.isArray(p?.variants)
    ? p.variants.map((v: any) => attrText(v?.size ?? v?.attributes?.size)).filter(Boolean)
    : [];
  return uniq([...a, ...b]);
};

const colorsOf = (p: any): string[] => {
  const a = Array.isArray(p?.colors) ? p.colors.map(attrText) : [];
  const b = Array.isArray(p?.variants)
    ? p.variants.map((v: any) => attrText(v?.color ?? v?.attributes?.color)).filter(Boolean)
    : [];
  return uniq([...a, ...b]);
};

const variantSkusOf = (p: any): string[] =>
  Array.isArray(p?.variants)
    ? p.variants.map((v: any) => v?.sku).filter(Boolean).map(String)
    : [];

const stockSum = (p: any): number =>
  (Array.isArray(p?.variants) ? p.variants : []).reduce(
    (sum: number, v: any) => sum + (Number(v?.stock ?? v?.stock_quantity ?? 0) || 0),
    0
  );

/* ============================== Component ============================== */
const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [catMap, setCatMap] = useState<Record<number, string>>({});
  const [activeVariantId, setActiveVariantId] = useState<number | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [catsRes, prodRes] = await Promise.all([
          fetchCategories(),
          fetchProduct(Number(id)),
        ]);

        const m: Record<number, string> = {};
        (catsRes ?? []).forEach((c: any) => {
          if (c?.id != null) m[c.id] = c.name;
        });
        setCatMap(m);

        setProduct(prodRes as Product);

        if (prodRes?.variants?.length) {
          setActiveVariantId(prodRes.variants[0].id);
        } else {
          setActiveVariantId(null);
        }
      } catch (e: any) {
        console.error(e);
        setError("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* ---------- Album ảnh ---------- */
  const albumUrls = useMemo(() => {
    if (!product) return [];
    const base = toAssetUrl((product as any).image);

    const fromVariants =
      product.variants?.flatMap((v: any) => {
        const singles: (string | undefined)[] = [toAssetUrl(v?.image)];
        const many = (Array.isArray(v?.images) ? v.images : parseImages(v?.images))
          .map(toAssetUrl)
          .filter(Boolean) as string[];
        return [...singles, ...many];
      }) ?? [];

    return unique([base, ...fromVariants].filter(Boolean) as string[]).slice(0, 12);
  }, [product]);

  /* ---------- Biến thể đang chọn ---------- */
  const activeVariant = useMemo(() => {
    if (!product || !activeVariantId) return null;
    return product.variants?.find((v: any) => v.id === activeVariantId) ?? null;
  }, [product, activeVariantId]);

  /* ---------- Ảnh cover ---------- */
  const coverUrl = useMemo(() => {
    if (selectedImage) return selectedImage;
    if (!product) return undefined;
    if (activeVariant?.image) return toAssetUrl(activeVariant.image);
    if ((product as any).image) return toAssetUrl((product as any).image);
    return albumUrls[0];
  }, [product, activeVariant, albumUrls, selectedImage]);

  // tồn kho
  const stock = (activeVariant?.stock_quantity ?? product?.stock_quantity ?? 0) || 0;
  const inStock = stock > 0;

  // giá hiển thị + % giảm
  const basePrice = toNum(product?.price);
  const salePrice = toNum(activeVariant?.price ?? product?.discount_price ?? product?.price);
  const showStrike = toNum(product?.discount_price) != null;
  const discountPercent =
    basePrice != null && salePrice != null && basePrice > 0 && salePrice < basePrice
      ? Math.round(((basePrice - salePrice) / basePrice) * 100)
      : null;

  // handlers (nối API giỏ/checkout của bạn tại đây)
  const handleAddToCart = () => {
    console.log("ADD_TO_CART", {
      product_id: product?.id,
      variant_id: activeVariant?.id ?? null,
      qty,
    });
  };
  const handleBuyNow = () => {
    console.log("BUY_NOW", {
      product_id: product?.id,
      variant_id: activeVariant?.id ?? null,
      qty,
    });
  };

  useEffect(() => {
    setSelectedImage(undefined);
  }, [activeVariantId]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 14 }} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error ?? "Không tìm thấy sản phẩm"} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* 👇 Container để canh giữa toàn bộ nội dung */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Title
          level={3}
          style={{ marginTop: 0, marginBottom: 12, textAlign: "center" }}
        >
          {product.name}
        </Title>

        {/* justify="center" giúp các cột nằm giữa khi màn hình rộng */}
        <Row gutter={[24, 24]} justify="center">
          {/* Ảnh bên trái */}
          <Col xs={24} md={10} lg={9}>
            <Card
              bodyStyle={{ padding: 14 }}
              styles={{ body: { display: "flex", flexDirection: "column", gap: 10 } }}
            >
              <Image.PreviewGroup items={albumUrls}>
                <Badge.Ribbon
                  text={discountPercent ? `-${discountPercent}%` : undefined}
                  color={discountPercent ? "red" : undefined}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#fafafa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ color: "#999" }}>No Image</div>
                    )}
                  </div>
                </Badge.Ribbon>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: 8,
                  }}
                >
                  {albumUrls.map((u, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(u)}
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        border: u === coverUrl ? "2px solid #1677ff" : "1px solid #eee",
                        cursor: "pointer",
                      }}
                    >
                      <Image src={u} width="100%" height={64} style={{ objectFit: "cover" }} preview={{ src: u }} />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
          </Col>

          {/* Mô tả bên phải */}
          <Col xs={24} md={14} lg={15}>
            <Card bodyStyle={{ padding: 18 }}>
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {/* Tag thông tin nhanh */}
                <Space size="small" wrap>
                  {product.variation_status ? <Tag color="green">Có biến thể</Tag> : <Tag>Không biến thể</Tag>}
                  <Tag>{catMap[product.category_id as number] ?? "Không phân loại"}</Tag>
                  {product.brand && <Tag color="blue">{product.brand}</Tag>}
                  {product.origin && <Tag color="purple">{product.origin}</Tag>}
                  <Tag color={inStock ? "green" : "red"}>{inStock ? `Còn ${stock}` : "Hết hàng"}</Tag>
                </Space>

                {/* Giá */}
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 10,
                  }}
                >
                  <Title level={3} style={{ margin: 0 }}>{vnd(salePrice)}</Title>
                  {showStrike && basePrice != null && (
                    <Text delete style={{ color: "#999" }}>{vnd(basePrice)}</Text>
                  )}
                  {discountPercent ? <Tag color="red">-{discountPercent}%</Tag> : null}
                </div>

                {/* Mô tả ngắn */}
                <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  <Text strong>Mô tả:</Text> {product.description || "—"}
                </Paragraph>

                {/* Size/Màu/Tồn tổng */}
                <Divider style={{ margin: "12px 0" }} />
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {sizesOf(product).length > 0 && (
                    <>
                      <Text strong>Size có sẵn:</Text>
                      <Space wrap>
                        {sizesOf(product).map((s) => (
                          <Tag key={`size-${s}`} color="processing">{s}</Tag>
                        ))}
                      </Space>
                    </>
                  )}

                  {colorsOf(product).length > 0 && (
                    <>
                      <Text strong>Màu sắc có sẵn:</Text>
                      <Space wrap>
                        {colorsOf(product).map((c) => (
                          <Tag key={`color-${c}`} color="magenta">{c}</Tag>
                        ))}
                      </Space>
                    </>
                  )}

                  <Text type="secondary">
                    Tồn kho tổng: <Text strong>{stockSum(product)}</Text>
                  </Text>
                </Space>

                {/* Số lượng + nút mua */}
                <Divider style={{ margin: "12px 0" }} />
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Space>
                    <Text strong>Số lượng:</Text>
                    <InputNumber
                      min={1}
                      max={Math.max(1, stock)}
                      value={qty}
                      onChange={(v) => setQty((v as number) || 1)}
                      style={{ width: 120 }}
                    />
                  </Space>

                  <div style={{ flex: 1 }} />

                  <Space wrap>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleAddToCart}
                      disabled={!inStock}
                      style={{ minWidth: 160 }}
                    >
                      Thêm vào giỏ
                    </Button>
                    <Button
                      size="large"
                      onClick={handleBuyNow}
                      disabled={!inStock}
                      style={{ minWidth: 160 }}
                    >
                      Mua ngay
                    </Button>
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ProductDetail;
