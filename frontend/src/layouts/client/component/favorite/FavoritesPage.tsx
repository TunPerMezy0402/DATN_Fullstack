import React, { useEffect, useMemo, useState } from "react";
import {
  Row, Col, Card, Typography, Space, Image, Button, Tag, Empty, Spin, message, Tooltip, Badge,
} from "antd";
import {
  HeartFilled, ShoppingCartOutlined, EyeOutlined, ReloadOutlined, AppstoreOutlined,
} from "@ant-design/icons";
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

// Giữ lại hàm này vì nó có thể được sử dụng trong hàm getPrices (nếu getPrices được giữ lại)
const vnd = (x?: number | string | null) =>
  x != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(x))
    : "—";

const toNum = (v: any) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/* ============ Types (khớp backend) ============ */
type Category = { id: number; name: string };
type Variant = { id: number; price?: number | string | null; discount_price?: number | string | null; image?: string | null; };
type Product = {
  id: number;
  name: string;
  category_id?: number;
  category?: Category;
  brand?: string;
  origin?: string;
  price?: number | string | null;
  discount_price?: number | string | null;
  image?: string | null;
  images?: string | null;
  variants?: Variant[];
  default_variant_id?: number;
  pivot?: { price?: number | string | null; discount_price?: number | string | null };
};

/* ============ Component ============ */
const FavoritesPage: React.FC = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const token = localStorage.getItem("access_token") || localStorage.getItem("token");

  /* ---------------- Lấy danh sách yêu thích ---------------- */
  const fetchLiked = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/user/liked-products`, {
        headers: {
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.status === 401) {
        message.info("Vui lòng đăng nhập để xem sản phẩm yêu thích");
        nav("/login");
        return;
      }
      const data = await res.json();
      const records: Product[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(records);
    } catch (e) {
      console.error(e);
      message.error("Không tải được danh sách yêu thích");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setRefreshing(true);
      await fetchLiked();
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- Bỏ yêu thích ---------------- */
  const handleRemove = async (productId: number) => {
    try {
      const res = await fetch(`${API_URL}/products/${productId}/unlike`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (res.status === 401) {
        message.info("Phiên đăng nhập đã hết hạn");
        nav("/login");
        return;
      }
      if (!res.ok) throw new Error("unlike_failed");
      setItems((prev) => prev.filter((p) => p.id !== productId));
      message.success("Đã bỏ yêu thích");
    } catch (e) {
      console.error(e);
      message.error("Bỏ yêu thích thất bại");
    }
  };

  /* ---------------- Thêm giỏ hàng (giữ logic như bạn) ---------------- */
  const addToCart = async (p: Product) => {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    if (!token) {
      message.info("Vui lòng đăng nhập để thêm vào giỏ hàng");
      nav("/login");
      return;
    }

    const tryVariantId =
      p.default_variant_id ??
      p.variants?.[0]?.id ??
      null;

    if (!tryVariantId) {
      message.info("Vui lòng chọn biến thể sản phẩm");
      nav(`/products/${p.id}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variant_id: tryVariantId,
          quantity: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "add_cart_failed");
      message.success(data?.message || "Đã thêm vào giỏ hàng");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Không thể thêm vào giỏ hàng");
    }
  };

  /* ---------------- Tính giá (Giữ lại hàm nhưng không dùng để hiển thị) ---------------- */
  const getPrices = (p: Product) => {
    const baseRaw =
      p.price ??
      p.pivot?.price ??
      p.variants?.[0]?.price ??
      (p as any)?.original_price ??
      null;

    const saleRaw =
      p.discount_price ??
      p.pivot?.discount_price ??
      p.variants?.[0]?.discount_price ??
      (p as any)?.sale_price ??
      baseRaw;

    const base = toNum(baseRaw);
    const sale = toNum(saleRaw);
    const hasDiscount = base != null && sale != null && sale < base;
    const discount = hasDiscount && base ? Math.round(((base - sale) / base) * 100) : null;

    return { base, sale, hasDiscount, discount };
  };

  /* ---------------- Render thẻ sản phẩm (Đã loại bỏ giá) ---------------- */
  const cards = useMemo(() => {
    return items.map((p) => {
      const cover =
        toAssetUrl(p.image) ||
        toAssetUrl((p.images || "").split(",").map((s) => s.trim()).filter(Boolean)[0]) ||
        toAssetUrl(p.variants?.[0]?.image);

      // Mặc dù gọi hàm này, các biến return của nó sẽ không được dùng để render giá
      const { discount } = getPrices(p); 

      return (
        <Col key={p.id} xs={24} sm={12} md={8} lg={6} xl={6}>
          <Card
            hoverable
            style={{
              borderRadius: 12,
              overflow: "hidden",
              height: "100%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              transition: "transform .3s ease, box-shadow .3s ease",
            }}
            bodyStyle={{ padding: 16 }}
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
                {/* Giữ lại Badge.Ribbon nếu muốn hiển thị phần trăm giảm giá */}
                {discount ? (
                  <Badge.Ribbon text={`-${discount}%`} color="#ef4444">
                    <div />
                  </Badge.Ribbon>
                ) : null}
                <Link to={`/products/${p.id}`}>
                  <Image
                    src={cover}
                    alt={p.name}
                    width="100%"
                    height={230}
                    style={{ objectFit: "cover" }}
                    preview={{ src: cover }}
                  />
                </Link>
                <Tooltip title="Bỏ khỏi yêu thích">
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<HeartFilled />}
                    onClick={() => handleRemove(p.id)}
                    style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}
                  />
                </Tooltip>
              </div>
            }
            actions={[
              <Link key="view" to={`/products/${p.id}`} style={{ fontWeight: 600, color: "#2563eb" }}>
                <EyeOutlined /> Xem chi tiết
              </Link>,
              <Button
                key="cart"
                type="primary"
                ghost
                icon={<ShoppingCartOutlined />}
                onClick={() => addToCart(p)}
              >
                Thêm giỏ
              </Button>,
            ]}
          >
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Typography.Text strong ellipsis style={{ fontSize: 16, color: "#1f2937", height: "40px", overflow: "hidden" }}>
                {p.name}
              </Typography.Text>

              {/* PHẦN HIỂN THỊ GIÁ ĐÃ BỊ LOẠI BỎ */}
              {/* <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <Typography.Title level={4} style={{ margin: 0, color: "#dc2626", fontSize: 20, lineHeight: 1 }}>
                  {sale != null ? vnd(sale) : "—"}
                </Typography.Title>

                {hasDiscount && base != null && (
                  <>
                    <Typography.Text delete type="secondary" style={{ fontSize: 14 }}>
                      {vnd(base)}
                    </Typography.Text>
                    <Tag color="red" style={{ marginLeft: "auto", fontWeight: 600 }}>
                      Giảm {discount}%
                    </Tag>
                  </>
                )}
              </div> */}

              <Space size={[6, 6]} wrap>
                {p.category?.name && <Tag color="blue">{p.category.name}</Tag>}
                {p.brand && <Tag color="purple">{p.brand}</Tag>}
                {p.origin && <Tag color="cyan">{p.origin}</Tag>}
              </Space>
            </Space>
          </Card>
        </Col>
      );
    });
  }, [items]);

  useEffect(() => {
    fetchLiked();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ background: "#f6f7fb", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,#6366f1 0%,#22c1c3 100%)",
          padding: "20px 0",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <Typography.Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
            <Space size={15}>
              <HeartFilled style={{ color: "#fee2e2" }} />
              Sản phẩm yêu thích
            </Space>
          </Typography.Title>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Text style={{ color: "#4b5563" }}>
            Tìm thấy <b>{items.length}</b> sản phẩm
          </Typography.Text>
          <Space size={10}>
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={refreshing}>
              Làm mới danh sách
            </Button>
            <Link to="/products">
              <Button type="primary" icon={<AppstoreOutlined />}>
                Khám phá thêm
              </Button>
            </Link>
          </Space>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 28px" }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Card style={{ borderRadius: 12, width: 520, textAlign: "center", padding: "20px" }}>
              <Empty
                imageStyle={{ height: 60 }}
                description={<Typography.Text style={{ fontSize: 16, color: "#4b5563" }}>Bạn chưa có sản phẩm yêu thích nào.</Typography.Text>}
              >
                <Link to="/products">
                  <Button type="primary" size="large">
                    Khám phá sản phẩm ngay
                  </Button>
                </Link>
              </Empty>
            </Card>
          </div>
        ) : (
          <Row gutter={[20, 20]} justify="start">
            {cards}
          </Row>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;