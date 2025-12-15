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
  Collapse,
} from "antd";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const { Panel } = Collapse;

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

      if (catId) params.category_id = catId;
      if (brand) params.brand = brand;
      if (selectedSizes.length > 0) params.sizes = selectedSizes.join(",");
      if (selectedColors.length > 0) params.colors = selectedColors.join(",");
      if (sellStatus === "selling") params.status = "selling";

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

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (categoryId) {
      setCatId(Number(categoryId));
    } else {
      setCatId(null);
    }
  }, [categoryId]);

  useEffect(() => {
    loadProducts(1);
  }, [catId, brand, selectedSizes, selectedColors, sellStatus, priceRange, customMin, customMax]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProducts(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------------------------- UI -------------------------- */
  return (
    <div style={{ padding: screens.xs ? 12 : 24, background: "#f5f5f5", minHeight: "100vh" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: screens.md
            ? "280px minmax(0, 1fr)"
            : "minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
          justifyContent: "center",
          margin: "0 auto",
          maxWidth: 1400,
        }}
      >
        {/* =============== Sidebar Filters =============== */}
        {screens.md && (
          <Card
            style={{ 
              position: "sticky", 
              top: 12, 
              width: 280,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  🔍 Bộ lọc
                </Title>
                {hasActiveFilters && (
                  <Button 
                    type="text" 
                    size="small" 
                    onClick={resetFilters}
                    style={{ color: "#1890ff", fontSize: 13 }}
                  >
                    Xóa tất cả
                  </Button>
                )}
              </Flex>
              <Divider style={{ margin: 0 }} />

              <Collapse 
                defaultActiveKey={['1', '2', '3', '4', '5', '6']} 
                ghost
                expandIconPosition="end"
              >
                {/* Giá */}
                <Panel 
                  header={<Text strong style={{ fontSize: 15 }}>💰 Khoảng giá</Text>} 
                  key="1"
                >
                  <Radio.Group
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <Flex vertical gap={8}>
                      <Radio value="<1">Dưới 1 triệu</Radio>
                      <Radio value="1-2">1 - 2 triệu</Radio>
                      <Radio value="2-4">2 - 4 triệu</Radio>
                      <Radio value=">4">Trên 4 triệu</Radio>
                      <Radio value="custom">Tùy chỉnh</Radio>
                    </Flex>
                  </Radio.Group>
                  {priceRange === "custom" && (
                    <Space direction="vertical" style={{ width: "100%", marginTop: 12 }} size={8}>
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
                </Panel>

                {/* Danh mục */}
                <Panel 
                  header={<Text strong style={{ fontSize: 15 }}>📂 Danh mục</Text>} 
                  key="2"
                >
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
                </Panel>

                {/* Size */}
                <Panel 
                  header={
                    <Flex align="center" gap={8}>
                      <Text strong style={{ fontSize: 15 }}>📏 Kích thước</Text>
                      {selectedSizes.length > 0 && (
                        <Tag color="blue" style={{ margin: 0 }}>{selectedSizes.length}</Tag>
                      )}
                    </Flex>
                  } 
                  key="3"
                >
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
                </Panel>

                {/* Màu sắc */}
                <Panel 
                  header={
                    <Flex align="center" gap={8}>
                      <Text strong style={{ fontSize: 15 }}>🎨 Màu sắc</Text>
                      {selectedColors.length > 0 && (
                        <Tag color="blue" style={{ margin: 0 }}>{selectedColors.length}</Tag>
                      )}
                    </Flex>
                  } 
                  key="4"
                >
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
                </Panel>

                {/* Thương hiệu */}
                <Panel 
                  header={<Text strong style={{ fontSize: 15 }}>🏷️ Thương hiệu</Text>} 
                  key="6"
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="Chọn thương hiệu"
                    options={allBrands.map((b) => ({ label: b, value: b }))}
                    value={brand ?? undefined}
                    onChange={(v) => setBrand(v ?? null)}
                    style={{ width: "100%" }}
                  />
                </Panel>

                {/* Trạng thái */}
                <Panel 
                  header={<Text strong style={{ fontSize: 15 }}>📦 Trạng thái</Text>} 
                  key="5"
                >
                  <Radio.Group
                    value={sellStatus}
                    onChange={(e) => setSellStatus(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <Flex vertical gap={8}>
                      <Radio value="all">Tất cả sản phẩm</Radio>
                      <Radio value="selling">Đang bán</Radio>
                    </Flex>
                  </Radio.Group>
                </Panel>
              </Collapse>
            </Space>
          </Card>
        )}

        {/* =============== Product List =============== */}
        <div style={{ width: "100%" }}>
          {/* Header */}
          <Card 
            style={{ 
              marginBottom: 20, 
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
          </Card>

          {/* Content */}
          {error ? (
            <Card style={{ borderRadius: 12 }}>
              <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <Empty description={error} />
              </div>
            </Card>
          ) : loading ? (
            <Card style={{ borderRadius: 12 }}>
              <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <Spin size="large" />
              </div>
            </Card>
          ) : products.length === 0 ? (
            <Card style={{ borderRadius: 12 }}>
              <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
                <Empty description="Không tìm thấy sản phẩm phù hợp." />
              </div>
            </Card>
          ) : (
            <>
              {/* Product Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: screens.lg
                    ? "repeat(4, 1fr)"
                    : screens.md
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
                  
                  // Kiểm tra sản phẩm có biến thể không
                  const hasVariants = p.variants && p.variants.length > 0;
                  const isOutOfStock = !hasVariants;

                  const discountPct =
                    compareAt && showPrice && compareAt > showPrice
                      ? Math.round(((compareAt - showPrice) / compareAt) * 100)
                      : null;

                  return (
                    <div
                      key={p.id}
                      style={{
                        position: "relative",
                        borderRadius: 16,
                        overflow: "hidden",
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                        opacity: isOutOfStock ? 0.7 : 1,
                      }}
                      onClick={() => navigate(`/products/${p.id}`)}
                      onMouseEnter={(e) => {
                        if (!isOutOfStock) {
                          e.currentTarget.style.transform = "translateY(-8px)";
                          e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.15)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                      }}
                    >
                      {/* Out of Stock Badge */}
                      {isOutOfStock && (
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            left: 12,
                            background: "#8c8c8c",
                            color: "#fff",
                            padding: "4px 12px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            zIndex: 2,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          }}
                        >
                          Hết hàng
                        </div>
                      )}

                      {/* Discount Badge */}
                      {!isOutOfStock && discountPct && (
                        <div
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            background: "#ff4d4f",
                            color: "#fff",
                            padding: "4px 10px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            zIndex: 2,
                            boxShadow: "0 2px 8px rgba(255,77,79,0.3)",
                          }}
                        >
                          -{discountPct}%
                        </div>
                      )}

                      {/* Product Image */}
                      <div
                        style={{
                          width: "100%",
                          height: 260,
                          overflow: "hidden",
                          background: "#fafafa",
                          position: "relative",
                        }}
                      >
                        <img
                          src={baseImg}
                          alt={p.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.4s ease",
                            filter: isOutOfStock ? "grayscale(50%)" : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (!isOutOfStock) {
                              e.currentTarget.style.transform = "scale(1.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        />
                      </div>

                      {/* Product Info */}
                      <div style={{ padding: 16 }}>
                        <Text
                          strong
                          className="product-name"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            fontSize: 15,
                            lineHeight: 1.5,
                            marginBottom: 12,
                            height: 45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            transition: "color 0.3s ease",
                          }}
                        >
                          {p.name}
                        </Text>
                        <style>{`
                          .product-name:hover { color: #1890ff !important; }
                        `}</style>

                        <Space direction="vertical" size={6} style={{ width: "100%", marginBottom: 12 }}>
                          {p.category?.name && (
                            <Flex justify="space-between">
                              <Text type="secondary" style={{ fontSize: 13 }}>Danh mục:</Text>
                              <Text style={{ fontSize: 13, fontWeight: 500 }}>{p.category.name}</Text>
                            </Flex>
                          )}
                          {p.brand && (
                            <Flex justify="space-between">
                              <Text type="secondary" style={{ fontSize: 13 }}>Thương hiệu:</Text>
                              <Text style={{ fontSize: 13, fontWeight: 500 }}>{p.brand}</Text>
                            </Flex>
                          )}
                          {p.origin && (
                            <Flex justify="space-between">
                              <Text type="secondary" style={{ fontSize: 13 }}>Xuất xứ:</Text>
                              <Text style={{ fontSize: 13, fontWeight: 500 }}>{p.origin}</Text>
                            </Flex>
                          )}
                        </Space>

                        <Divider style={{ margin: "12px 0" }} />

                        {isOutOfStock ? (
                          <div style={{ textAlign: "center", padding: "8px 0" }}>
                            <Text type="secondary" style={{ fontSize: 15, fontWeight: 600 }}>
                              Đã hết hàng
                            </Text>
                          </div>
                        ) : (
                          <Space direction="vertical" size={4} style={{ width: "100%" }}>
                            {compareAt && showPrice && compareAt > showPrice && (
                              <Flex justify="space-between">
                                <Text delete type="secondary" style={{ fontSize: 13 }}>
                                  {fmtVND(compareAt)} đ
                                </Text>
                                <Text type="danger" style={{ fontSize: 13, fontWeight: 600 }}>
                                  -{fmtVND(compareAt - showPrice)} đ
                                </Text>
                              </Flex>
                            )}
                            <Title level={4} style={{ margin: 0, color: "#ff4d4f", fontSize: 20, fontWeight: 700 }}>
                              {showPrice ? `${fmtVND(showPrice)} đ` : "Liên hệ"}
                            </Title>
                          </Space>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                marginTop: 32,
                padding: "20px 0"
              }}>
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