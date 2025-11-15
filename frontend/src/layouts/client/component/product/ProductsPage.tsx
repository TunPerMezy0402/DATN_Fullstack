import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Grid,
  InputNumber,
  Pagination,
  Radio,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;

/* ------------ Base URL + Axios ------------ */
const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (import.meta as any).env?.REACT_APP_API_URL ||
  (process as any).env?.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api";

const raw = axios.create({ baseURL: API_URL, timeout: 20000 });
raw.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    (config.headers as any) = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

/* ------------ Helpers ------------ */
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const stockSum = (variants: any[]): number =>
  (variants || []).reduce(
    (sum: number, v: any) => sum + (Number(v?.stock_quantity ?? 0) || 0),
    0
  );

/* ------------ Interfaces ------------ */
interface Category {
  id: number;
  name: string;
  image?: string;
}

interface Product {
  id: number;
  name: string;
  sku?: string;
  description?: string;
  category_id?: number;
  image?: string;
  image_url?: string;
  brand?: string;
  origin?: string;
  created_at: string;
  variants?: any[];
  min_variant?: any;
  min_effective_price?: number;
  min_original_price?: number;
  category?: Category;
  sizes?: string[];
  colors?: string[];
}

/* ------------ Main Component ------------ */
const ProductsPage: React.FC = () => {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const { id: categoryId } = useParams<{ id?: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data từ API
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSizes, setAllSizes] = useState<string[]>([]);
  const [allColors, setAllColors] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);

  // Filters
  const [priceRange, setPriceRange] = useState<"<1" | "1-2" | "2-4" | ">4" | "custom" | null>(null);
  const [customMin, setCustomMin] = useState<number | null>(null);
  const [customMax, setCustomMax] = useState<number | null>(null);
  const [catId, setCatId] = useState<number | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [sellStatus, setSellStatus] = useState<"all" | "selling">("all");

  /* --------- Load filter options (brands, sizes, colors) --------- */
  const loadOptions = async () => {
    try {
      const [brandsRes, sizesRes, colorsRes] = await Promise.all([
        raw.get("/client/products/brands"),
        raw.get("/client/products/sizes"),
        raw.get("/client/products/colors"),
      ]);

      setAllBrands(brandsRes.data.brands || []);
      setAllSizes(sizesRes.data.sizes || []);
      setAllColors(colorsRes.data.colors || []);
    } catch (e) {
      console.error("Failed to load options:", e);
    }
  };

  /* --------- Load products từ API với filters --------- */
  const loadProducts = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        per_page: pageSize,
        page,
      };

      // Category filter
      if (catId) {
        params.category_id = catId;
      }

      // Brand filter
      if (brand) {
        params.brand = brand;
      }

      // Size filter (comma-separated string)
      if (selectedSizes.length > 0) {
        params.sizes = selectedSizes.join(",");
      }

      // Color filter (comma-separated string)
      if (selectedColors.length > 0) {
        params.colors = selectedColors.join(",");
      }

      // Sell status filter
      if (sellStatus === "selling") {
        params.status = "selling";
      }

      // Price range filter
      if (priceRange && priceRange !== "custom") {
        switch (priceRange) {
          case "<1":
            params.price_max = 999999;
            break;
          case "1-2":
            params.price_min = 1000000;
            params.price_max = 2000000;
            break;
          case "2-4":
            params.price_min = 2000001;
            params.price_max = 4000000;
            break;
          case ">4":
            params.price_min = 4000001;
            break;
        }
      } else if (priceRange === "custom") {
        if (customMin !== null) params.price_min = customMin;
        if (customMax !== null) params.price_max = customMax;
      }

      const response = await raw.get("/client/products", { params });
      const data = response.data;

      // API returns: { categories, products: {data, total, current_page, ...} }
      if (data.products) {
        setProducts(Array.isArray(data.products.data) ? data.products.data : []);
        setTotal(data.products.total || 0);
        setCurrentPage(data.products.current_page || 1);
      }

      if (data.categories) {
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (e: any) {
      console.error("Load products error:", e);
      const status = e?.response?.status;
      setError(
        status === 401 || status === 403
          ? "Bạn chưa đăng nhập hoặc không đủ quyền."
          : "Không thể tải dữ liệu sản phẩm."
      );
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  /* --------- Load options when component mounts --------- */
  useEffect(() => {
    loadOptions();
  }, []);

  /* --------- Sync category from URL params --------- */
  useEffect(() => {
    if (categoryId) {
      setCatId(Number(categoryId));
    } else {
      setCatId(null);
    }
  }, [categoryId]);

  /* --------- Reload products when ANY filter changes --------- */
  useEffect(() => {
    loadProducts(1); // Always reset to page 1 when filters change
  }, [catId, brand, selectedSizes, selectedColors, sellStatus, priceRange, customMin, customMax]);

  /* --------- Reset all filters --------- */
  const resetFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setBrand(null);
    setCatId(null);
    setPriceRange(null);
    setCustomMin(null);
    setCustomMax(null);
    setSellStatus("all");
    navigate("/products", { replace: true });
  };

  const hasActiveFilters =
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    brand ||
    catId ||
    priceRange ||
    sellStatus !== "all";

  /* --------- Handle pagination --------- */
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProducts(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------------------------- UI -------------------------- */
  return (
    <div style={{ padding: screens.xs ? 12 : 24 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md
            ? "320px minmax(0, 900px)"
            : "minmax(0, 900px)",
          gap: 24,
          alignItems: "start",
          justifyContent: "center",
          justifyItems: "center",
          margin: "0 auto",
          maxWidth: 1240,
        }}
      >
        {/* =============== Sidebar Filters =============== */}
        {screens.md && (
          <Card
            style={{ position: "sticky", top: 12, width: 320 }}
            styles={{ body: { padding: 16 } }}
          >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <Title level={5} style={{ margin: 0 }}>
                  Bộ lọc
                </Title>
                {hasActiveFilters && (
                  <Button type="link" size="small" onClick={resetFilters}>
                    Xóa tất cả
                  </Button>
                )}
              </Flex>
              <Divider style={{ margin: "8px 0" }} />

              {/* Giá */}
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>💲</Tag>
                  <Text strong>Giá</Text>
                </Space>
                <Radio.Group
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                >
                  <Flex vertical gap={8}>
                    <Radio.Button value="<1">Dưới 1 triệu</Radio.Button>
                    <Radio.Button value="1-2">1 - 2 triệu</Radio.Button>
                    <Radio.Button value="2-4">2 - 4 triệu</Radio.Button>
                    <Radio.Button value=">4">Trên 4 triệu</Radio.Button>
                    <Radio.Button value="custom">Khoảng tuỳ chọn</Radio.Button>
                  </Flex>
                </Radio.Group>
                {priceRange === "custom" && (
                  <Space direction="vertical" style={{ width: "100%" }} size={8}>
                    <InputNumber
                      placeholder="Từ (VNĐ)"
                      min={0}
                      value={customMin}
                      onChange={(v) => setCustomMin(v)}
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ""))}
                    />
                    <InputNumber
                      placeholder="Đến (VNĐ)"
                      min={0}
                      value={customMax}
                      onChange={(v) => setCustomMax(v)}
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ""))}
                    />
                  </Space>
                )}
              </Space>

              {/* Danh mục */}
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>📁</Tag>
                  <Text strong>Danh mục</Text>
                </Space>
                <Select
                  allowClear
                  showSearch
                  placeholder="Chọn danh mục"
                  optionFilterProp="label"
                  options={categories.map((c) => ({ label: c.name, value: c.id }))}
                  value={catId ?? undefined}
                  onChange={(v) => {
                    setCatId(v ?? null);
                    if (v) {
                      navigate(`/products/category/${v}`, { replace: true });
                    } else {
                      navigate("/products", { replace: true });
                    }
                  }}
                  style={{ width: "100%" }}
                />
              </Space>

              {/* Thương hiệu */}
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>🏷️</Tag>
                  <Text strong>Thương hiệu</Text>
                </Space>
                <Select
                  allowClear
                  showSearch
                  placeholder="Chọn thương hiệu"
                  options={allBrands.map((b) => ({ label: b, value: b }))}
                  value={brand ?? undefined}
                  onChange={(v) => setBrand(v ?? null)}
                  style={{ width: "100%" }}
                />
              </Space>

              {/* Size */}
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>📏</Tag>
                  <Text strong>Size</Text>
                  {selectedSizes.length > 0 && (
                    <Tag color="blue">{selectedSizes.length}</Tag>
                  )}
                </Space>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="Chọn size"
                  options={allSizes.map((s) => ({ label: s, value: s }))}
                  value={selectedSizes}
                  onChange={(v) => setSelectedSizes(v)}
                  style={{ width: "100%" }}
                  maxTagCount="responsive"
                />
              </Space>

              {/* Màu sắc */}
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>🎨</Tag>
                  <Text strong>Màu sắc</Text>
                  {selectedColors.length > 0 && (
                    <Tag color="blue">{selectedColors.length}</Tag>
                  )}
                </Space>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  placeholder="Chọn màu"
                  options={allColors.map((c) => ({ label: c, value: c }))}
                  value={selectedColors}
                  onChange={(v) => setSelectedColors(v)}
                  style={{ width: "100%" }}
                  maxTagCount="responsive"
                />
              </Space>

              {/* Trạng thái */}
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space align="center" size={8}>
                  <Tag bordered={false}>📦</Tag>
                  <Text strong>Trạng thái</Text>
                </Space>
                <Radio.Group
                  value={sellStatus}
                  onChange={(e) => setSellStatus(e.target.value)}
                >
                  <Flex vertical gap={8}>
                    <Radio.Button value="all">Tất cả</Radio.Button>
                    <Radio.Button value="selling">Đang bán</Radio.Button>
                  </Flex>
                </Radio.Group>
              </Space>
            </Space>
          </Card>
        )}

        {/* =============== Product List =============== */}
        <div style={{ width: "100%" }}>
          {/* Header */}
          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }} wrap>
            <Text type="secondary">
              Tìm thấy <Text strong>{total}</Text> sản phẩm
            </Text>
            {hasActiveFilters && (
              <Button type="primary" size="small" onClick={resetFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </Flex>

          {/* Content */}
          {error ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Empty description={error} />
            </div>
          ) : loading ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Spin size="large" />
            </div>
          ) : products.length === 0 ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
              <Empty description="Không tìm thấy sản phẩm phù hợp." />
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: screens.md
                    ? "repeat(3, 1fr)"
                    : "repeat(2, 1fr)",
                  gap: 16,
                }}
              >
                {products.map((p) => {
                  const baseImg =
                    p.image_url || "https://via.placeholder.com/600x600?text=No+Image";
                  const showPrice = p.min_effective_price;
                  const compareAt = p.min_original_price;
                  const totalStock = stockSum(p.variants || []);

                  const discountPct =
                    compareAt && showPrice && compareAt > showPrice
                      ? Math.round(((compareAt - showPrice) / compareAt) * 100)
                      : null;

                  return (
                    <Badge.Ribbon
                      key={p.id}
                      text={
                        discountPct
                          ? `-${discountPct}%`
                          : totalStock > 0
                          ? `Kho: ${totalStock}`
                          : "Hết hàng"
                      }
                      color={discountPct ? "red" : totalStock > 0 ? "blue" : "default"}
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
                            style={{
                              width: "100%",
                              height: 240,
                              objectFit: "cover",
                            }}
                          />
                        }
                      >
                        <Space direction="vertical" size={8} style={{ width: "100%" }}>
                          <Text strong ellipsis={{ tooltip: p.name }}>
                            {p.name}
                          </Text>
                          {p.brand && <Tag>{p.brand}</Tag>}

                          <Space size={8} align="baseline" wrap>
                            <Title level={5} style={{ margin: 0, color: "#ff4d4f" }}>
                              {showPrice !== null && showPrice !== undefined
                                ? `${fmtVND(showPrice)} đ`
                                : "Liên hệ"}
                            </Title>
                            {compareAt !== null &&
                              compareAt !== undefined &&
                              compareAt > (showPrice ?? 0) && (
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

              {/* Pagination */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  showTotal={(t, range) =>
                    `${range[0]}-${range[1]} của ${t} sản phẩm`
                  }
                  showSizeChanger={false}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;