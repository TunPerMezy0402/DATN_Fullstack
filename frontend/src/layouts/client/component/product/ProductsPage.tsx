import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  InputNumber,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import {
  fetchProducts,
  parseImages,
  type Product,
} from "../../../../api/productApi";
import axios from "axios";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

/* ------------ Base URL + Axios ------------ */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api/products";
const ASSET_BASE = String(API_URL).replace(/\/api\/?$/, "");

const raw = axios.create({ baseURL: API_URL, timeout: 20000 });
raw.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token)
    (config.headers as any) = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  return config;
});

const toAssetUrl = (u?: string | null): string | undefined => {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `${ASSET_BASE}/${String(u).replace(/^\/+/, "")}`;
};

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

/* ------------ Helper: chuyển object -> text (size/color) ------------ */
const attrText = (x: any): string => {
  if (!x) return "";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "object") {
    return x.value || x.name || x.label || x.text || String(x.id || "");
  }
  return String(x);
};

/* ------------ Helpers sản phẩm/biến thể ------------ */
const coverUrl = (p: Product): string | undefined => {
  const pImg = (p as any).image as string | undefined;
  if (pImg) return toAssetUrl(pImg);
  const fromVariants =
    p.variants?.flatMap((v: any) => {
      const singles: (string | undefined)[] = [v?.image];
      const albums = (Array.isArray(v?.images) ? v.images : parseImages(v?.images)) as string[];
      return [...singles, ...(albums ?? [])];
    }) ?? [];
  const first = fromVariants.find(Boolean) as string | undefined;
  return toAssetUrl(first);
};

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

const stockSum = (p: any): number =>
  (Array.isArray(p?.variants) ? p.variants : []).reduce(
    (sum: number, v: any) => sum + (Number(v?.stock ?? v?.stock_quantity ?? 0) || 0),
    0
  );

const anyVariantAvailable = (p: any): boolean =>
  (Array.isArray(p?.variants) ? p.variants : []).some((v: any) => !!v?.is_available);

/* ------------ Helpers GIÁ ------------ */
// Parse "100000" hoặc "100,000" => 100000; null/undefined/NaN => null
const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, "")); // an toàn với "1.000.000" / "1,000,000"
  return Number.isFinite(n) ? n : null;
};

// Tính giá hiển thị cho 1 product
// - Có biến thể: lấy min(discount_price) nếu có, else min(price)
// - Không có biến thể: dùng product.discount_price || product.price
const priceForDisplay = (
  p: any
): { price: number | null; compareAt: number | null } => {
  const variants: any[] = Array.isArray(p?.variants) ? p.variants : [];

  if (variants.length > 0) {
    const variantDiscounts = variants
      .map((v) => toNum(v?.discount_price))
      .filter((x): x is number => x !== null);
    const variantPrices = variants
      .map((v) => toNum(v?.price))
      .filter((x): x is number => x !== null);

    if (variantDiscounts.length > 0) {
      const minDiscount = Math.min(...variantDiscounts);
      const minBase = variantPrices.length > 0 ? Math.min(...variantPrices) : null;
      return {
        price: minDiscount,
        compareAt: minBase && minBase > minDiscount ? minBase : null,
      };
    }
    if (variantPrices.length > 0) {
      const minPrice = Math.min(...variantPrices);
      return { price: minPrice, compareAt: null };
    }
  }

  const sale = toNum(p?.discount_price);
  const base = toNum(p?.price);

  if (sale !== null && (base === null || sale < base)) {
    return { price: sale, compareAt: base ?? null };
  }
  return { price: base, compareAt: null };
};

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/* =================================================================== */
const ProductsPage: React.FC = () => {
  const screens = useBreakpoint();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // data
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ value: number; label: string }>>([]);

  // filters
  const [priceRange, setPriceRange] =
    useState<"<1" | "1-2" | "2-4" | ">4" | "custom" | null>(null);
  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);

  const [catId, setCatId] = useState<number | null>(null);
  const [sizeText, setSizeText] = useState<string | null>(null);
  const [colorText, setColorText] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [sellStatus, setSellStatus] = useState<"all" | "selling">("all");

  /* --------- Load products + categories --------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [prods, catsRes] = await Promise.all([
          fetchProducts(),
          raw.get("/admin/categories", { params: { per_page: 1000 } }),
        ]);

        setAllProducts(Array.isArray(prods) ? prods : []);

        const catsRaw = Array.isArray(catsRes.data)
          ? catsRes.data
          : catsRes.data?.data?.data || catsRes.data?.data || [];
        setCategories(catsRaw.map((c: any) => ({ value: Number(c.id), label: c.name })));

        setError(null);
      } catch (e: any) {
        console.error(e);
        const status = e?.response?.status;
        setError(
          status === 401 || status === 403
            ? "Bạn chưa đăng nhập hoặc không đủ quyền."
            : "Không thể tải dữ liệu."
        );
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // brands + options size/color động
  const BRAND_OPTIONS = useMemo(
    () => uniq(allProducts.map((p: any) => p?.brand).filter(Boolean)),
    [allProducts]
  );
  const SIZE_TEXT_OPTIONS = useMemo(
    () => uniq(allProducts.flatMap((p) => sizesOf(p))).sort(),
    [allProducts]
  );
  const COLOR_TEXT_OPTIONS = useMemo(
    () => uniq(allProducts.flatMap((p) => colorsOf(p))).sort(),
    [allProducts]
  );

  /* -------------------------- Lọc dữ liệu -------------------------- */
  const filtered = useMemo(() => {
    let result = [...allProducts];

    if (catId != null) {
      result = result.filter((p: any) => Number(p.category_id) === Number(catId));
    }
    if (brand) result = result.filter((p: any) => (p.brand ? p.brand === brand : false));
    if (sizeText) result = result.filter((p) => sizesOf(p).includes(sizeText));
    if (colorText) result = result.filter((p) => colorsOf(p).includes(colorText));
    if (sellStatus === "selling") {
      result = result.filter((p) => anyVariantAvailable(p));
    }

    if (priceRange && priceRange !== "custom") {
      result = result.filter((p: any) => {
        const { price } = priceForDisplay(p);
        const val = price ?? 0;
        switch (priceRange) {
          case "<1":
            return val < 1_000_000;
          case "1-2":
            return val >= 1_000_000 && val <= 2_000_000;
          case "2-4":
            return val > 2_000_000 && val <= 4_000_000;
          case ">4":
            return val > 4_000_000;
        }
      });
    }
    if (priceRange === "custom") {
      result = result.filter((p: any) => {
        const { price } = priceForDisplay(p);
        const val = price ?? 0;
        const minOK = customMin == null ? true : val >= customMin;
        const maxOK = customMax == null ? true : val <= customMax;
        return minOK && maxOK;
      });
    }

    return result;
  }, [allProducts, catId, brand, sizeText, colorText, sellStatus, priceRange, customMin, customMax]);

  /* -------------------------- Click helpers -------------------------- */
  const onPickSize = (s: string) => setSizeText((cur) => (cur === s ? null : s));
  const onPickColor = (c: string) => setColorText((cur) => (cur === c ? null : c));
  const onPickBrand = (b: string) => setBrand((cur) => (cur === b ? null : b));
  const onCardClick = (p: Product) => navigate(`/products/${p.id}`);

  /* -------------------------- UI -------------------------- */
  return (
    <div style={{ padding: screens.xs ? 12 : 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md ? "300px minmax(0, 900px)" : "minmax(0, 900px)",
          gap: 24,
          alignItems: "start",
          justifyContent: "center",
          justifyItems: "center",
          margin: "0 auto",
          maxWidth: 1200,
        }}
      >
        {/* Sidebar */}
        <Card style={{ position: "sticky", top: 12, width: 300 }} styles={{ body: { padding: 16 } }}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Title level={5} style={{ margin: 0 }}>Bộ lọc sản phẩm</Title>
            <Divider style={{ margin: "8px 0" }} />

            {/* Giá */}
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Space align="center" size={8}>
                <Tag bordered={false}>💲</Tag>
                <Text strong>Giá</Text>
              </Space>
              <Radio.Group value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
                <Flex vertical gap={8}>
                  <Radio.Button value="<1">Dưới 1 triệu</Radio.Button>
                  <Radio.Button value="1-2">1 - 2 triệu</Radio.Button>
                  <Radio.Button value="2-4">2 - 4 triệu</Radio.Button>
                  <Radio.Button value=">4">Trên 4 triệu</Radio.Button>
                  <Radio.Button value="custom">Khoảng tuỳ chọn</Radio.Button>
                </Flex>
              </Radio.Group>
              {priceRange === "custom" && (
                <Space>
                  <InputNumber
                    placeholder="Từ"
                    min={0}
                    value={customMin as number | null}
                    onChange={(v) => setCustomMin(typeof v === "number" ? v : null)}
                    addonAfter="đ"
                  />
                  <InputNumber
                    placeholder="Đến"
                    min={0}
                    value={customMax as number | null}
                    onChange={(v) => setCustomMax(typeof v === "number" ? v : null)}
                    addonAfter="đ"
                  />
                </Space>
              )}
            </Space>

            {/* Danh mục */}
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text strong>Danh mục</Text>
              <Select
                allowClear
                showSearch
                placeholder="Chọn danh mục"
                optionFilterProp="label"
                options={categories}
                value={catId ?? undefined}
                onChange={(v) => setCatId(v ?? null)}
              />
            </Space>

            {/* Thương hiệu */}
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text strong>Thương hiệu</Text>
              <Select
                allowClear
                showSearch
                placeholder="Chọn thương hiệu"
                options={BRAND_OPTIONS.map((b) => ({ label: b, value: b }))}
                value={brand ?? undefined}
                onChange={(v) => setBrand(v ?? null)}
              />
            </Space>

            {/* Size */}
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text strong>Size</Text>
              <Select
                allowClear
                showSearch
                placeholder="Chọn size"
                options={SIZE_TEXT_OPTIONS.map((s) => ({ label: s, value: s }))}
                value={sizeText ?? undefined}
                onChange={(v) => setSizeText(v ?? null)}
              />
            </Space>

            {/* Màu sắc */}
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text strong>Màu sắc</Text>
              <Select
                allowClear
                showSearch
                placeholder="Chọn màu"
                options={COLOR_TEXT_OPTIONS.map((c) => ({ label: c, value: c }))}
                value={colorText ?? undefined}
                onChange={(v) => setColorText(v ?? null)}
              />
            </Space>

          </Space>
        </Card>

        {/* Danh sách */}
        <div style={{ width: "100%" }}>
          {error ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Empty description={error} />
            </div>
          ) : loading ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Spin size="large" />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Empty description="Không có sản phẩm nào." />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: screens.md ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {filtered.map((p) => {
                const baseImg =
                  coverUrl(p) || "https://via.placeholder.com/600x600?text=No+Image";
                const { price: showPrice, compareAt } = priceForDisplay(p);
                const sList = sizesOf(p);
                const cList = colorsOf(p);
                const totalStock = stockSum(p);

                const discountPct =
                  compareAt && showPrice && compareAt > showPrice
                    ? Math.round(((compareAt - showPrice) / compareAt) * 100)
                    : null;

                return (
                  <Badge.Ribbon
                    key={`r-${p.id}`}
                    text={
                      discountPct
                        ? `-${discountPct}%`
                        : totalStock > 0
                          ? `Tồn: ${totalStock}`
                          : "Hết hàng"
                    }
                    color={discountPct ? "red" : totalStock > 0 ? "blue" : "red"}
                  >
                    <Card
                      hoverable
                      onClick={() => navigate(`/products/${p.id}`)}
                      styles={{ body: { padding: 12 } }}
                      style={{ cursor: "pointer" }}
                      cover={
                        <img
                          src={baseImg}
                          alt={p.name}
                          style={{ width: "100%", height: 240, objectFit: "cover" }}
                        />
                      }
                    >
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <Text strong>{p.name}</Text>
                        {(p as any).brand && (
                          <Tag
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              navigate(`/products/${p.id}`);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {(p as any).brand}
                          </Tag>
                        )}

                        <Space size={8} align="baseline">
                          <Title level={5} style={{ margin: 0 }}>
                            {showPrice !== null ? `${fmtVND(showPrice)} đ` : "—"}
                          </Title>
                          {compareAt !== null && (
                            <Text delete type="secondary">
                              {fmtVND(compareAt)} đ
                            </Text>
                          )}
                        </Space>
                      </Space>
                    </Card>
                  </Badge.Ribbon>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
