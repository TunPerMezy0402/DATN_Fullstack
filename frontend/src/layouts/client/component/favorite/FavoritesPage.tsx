import React, { useEffect, useMemo, useState } from "react";
import {
  Row, Col, Card, Typography, Space, Image, Button, Empty, Spin, message, Tooltip,
} from "antd";
import { HeartFilled, EyeOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";

/* ============ Helpers ============ */
const getApiUrl = (): string => {
  const meta = (import.meta as any)?.env;
  return meta?.VITE_API_URL || meta?.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
};
const API_URL = getApiUrl();
const ASSET_BASE = API_URL.replace(/\/api\/?$/, "");

const toAssetUrl = (u?: string | null) =>
  !u ? undefined : /^https?:\/\//i.test(String(u)) ? String(u) : `${ASSET_BASE}/${String(u).replace(/^\/+/, "")}`;

const vnd = (x?: number | string | null) =>
  x != null ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(x)) : "—";

const toNum = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Tính giá hiển thị: ưu tiên min(discount) của variants → min(price) → product */
const priceForDisplay = (p: any): { price: number | null; compareAt: number | null } => {
  const variants: any[] = Array.isArray(p?.variants) ? p.variants : [];

  if (variants.length > 0) {
    const variantDiscounts = variants.map(v => toNum(v?.discount_price)).filter((x): x is number => x !== null);
    const variantPrices    = variants.map(v => toNum(v?.price)).filter((x): x is number => x !== null);

    if (variantDiscounts.length > 0) {
      const minDiscount = Math.min(...variantDiscounts);
      const minBase = variantPrices.length ? Math.min(...variantPrices) : null;
      return { price: minDiscount, compareAt: minBase && minBase > minDiscount ? minBase : null };
    }
    if (variantPrices.length > 0) return { price: Math.min(...variantPrices), compareAt: null };
  }

  const sale = toNum(p?.discount_price);
  const base = toNum(p?.price);
  if (sale !== null && (base === null || sale < base)) return { price: sale, compareAt: base ?? null };
  return { price: base, compareAt: null };
};

/* ============ Types ============ */
type Variant = { id: number; price?: number | string | null; discount_price?: number | string | null; image?: string | null; sku?: string | null };
type Product = {
  id: number;
  name: string;
  image?: string | null;
  images?: string | null;
  price?: number | string | null;
  discount_price?: number | string | null;
  variants?: Variant[];
  default_variant_id?: number;
};

const FavoritesPage: React.FC = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Product[]>([]);
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");

  const fetchLiked = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/user/liked-products`, {
        headers: { Accept: "application/json", Authorization: token ? `Bearer ${token}` : "" },
      });
      if (res.status === 401) { message.info("Vui lòng đăng nhập"); nav("/login"); return; }
      const data = await res.json();
      const records: Product[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(records);
    } catch {
      message.error("Không tải được danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      const res = await fetch(`${API_URL}/products/${productId}/unlike`, {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
      });
      if (res.status === 401) { message.info("Phiên đăng nhập đã hết hạn"); nav("/login"); return; }
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(p => p.id !== productId));
      message.success("Đã bỏ yêu thích");
    } catch {
      message.error("Bỏ yêu thích thất bại");
    }
  };

  // Lấy nhãn nhỏ dưới tên (giống “Jordan 2”): ưu tiên SKU biến thể đầu → rỗng
  const smallLabel = (p: Product) =>
    (p.variants?.[0]?.sku && String(p.variants[0].sku)) || "";

  const cards = useMemo(() => {
    return items.map((p) => {
      const cover =
        toAssetUrl(p.image) ||
        toAssetUrl((p.images || "").split(",").map(s => s.trim()).filter(Boolean)[0]) ||
        toAssetUrl(p.variants?.[0]?.image);

      const { price: showPrice, compareAt } = priceForDisplay(p);
      const discountPct =
        compareAt && showPrice && compareAt > showPrice
          ? Math.round(((compareAt - showPrice) / compareAt) * 100)
          : null;

      return (
        <Col key={p.id} xs={24} sm={12} md={8} lg={6} xl={6}>
          <Card
            hoverable
            style={{
              borderRadius: 12, overflow: "hidden", height: "100%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              transition: "transform .3s ease, box-shadow .3s ease",
            }}
            bodyStyle={{ padding: 12 }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 32px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            cover={
              <div style={{ position: "relative" }}>
                {discountPct ? (
                  <div
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: "#ef4444", color: "#fff", borderRadius: 6,
                      padding: "2px 8px", fontSize: 12, fontWeight: 700, zIndex: 10,
                    }}
                  >
                    -{discountPct}%
                  </div>
                ) : null}

                <Link to={`/products/${p.id}`}>
                  <Image src={cover} alt={p.name} width="100%" height={230} style={{ objectFit: "cover" }} preview={{ src: cover }} />
                </Link>

                {/* nút bỏ yêu thích (trên ảnh) */}
                <Tooltip title="Bỏ khỏi yêu thích">
                  <Button
                    type="primary" danger shape="circle" icon={<HeartFilled />}
                    onClick={() => handleRemove(p.id)}
                    style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}
                  />
                </Tooltip>
              </div>
            }
            actions={[
              <Link key="view" to={`/products/${p.id}`} style={{ fontWeight: 600 }}>
                <EyeOutlined /> Xem chi tiết
              </Link>,
            ]}
          >
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {/* Tên sản phẩm */}
              <Typography.Text strong ellipsis style={{ fontSize: 16 }}>
                {p.name}
              </Typography.Text>

              {/* Tag nhỏ nếu có */}
              {smallLabel(p) && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "#f5f5f5",
                    fontSize: 12,
                    color: "#555",
                    width: "fit-content",
                  }}
                >
                  {smallLabel(p)}
                </span>
              )}

              {/* Giá + giá gạch */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {showPrice != null ? vnd(showPrice) : "—"}
                </Typography.Title>
                {compareAt != null && (
                  <Typography.Text delete type="secondary" style={{ fontSize: 13 }}>
                    {vnd(compareAt)}
                  </Typography.Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>
      );
    });
  }, [items]);

  useEffect(() => { fetchLiked(); }, []);

  if (loading) {
    return <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, textAlign: "center" }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 28px" }}>
      {items.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: "center" }}>
          <Empty description="Bạn chưa có sản phẩm yêu thích nào." />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>{cards}</Row>
      )}
    </div>
  );
};

export default FavoritesPage;