// src/pages/admin/products/ProductList.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  Tag,
  Tooltip,
  Image,
  Descriptions,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SortDescendingOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  Product,
  Category,
  fetchCategories,
  deleteProduct,
} from "../../../api/productApi";

/* ============================== Asset URL helper ============================== */
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

// ✅ Helper để parse images an toàn
const safeParseImages = (images: any): string[] => {
  if (Array.isArray(images)) {
    return images.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  }
  
  if (typeof images === 'string' && images.trim() !== '') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
      }
    } catch (e) {
      console.warn('Failed to parse images JSON:', images);
    }
  }
  
  return [];
};

/* ============================== Component ============================== */
const ProductList: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catMap, setCatMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [searchText, setSearchText] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // ✅ Fetch products với pagination từ API
  const loadProducts = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString(),
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`${API_URL}/admin/products?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Thêm authorization header nếu cần
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      
      // Backend trả về cấu trúc pagination của Laravel
      setProducts(Array.isArray(data.data) ? data.data : []);
      setTotal(data.total || 0);
      setCurrentPage(data.current_page || 1);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu sản phẩm!");
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);

      const map: Record<number, string> = {};
      cats.forEach((c: Category) => {
        if (c?.id != null) map[c.id] = c.name;
      });
      setCatMap(map);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải danh mục!");
    }
  };

  // Load categories một lần khi mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load products khi page hoặc search thay đổi
  useEffect(() => {
    loadProducts(currentPage, searchText);
  }, [currentPage, searchText]);

  const onDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      message.success("🗑️ Đã xóa mềm sản phẩm!");
      // Reload lại trang hiện tại
      loadProducts(currentPage, searchText);
    } catch (e) {
      console.error(e);
      message.error("Không thể xóa sản phẩm!");
    }
  };

  // ✅ Xử lý search - reset về trang 1
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1); // Reset về trang 1 khi search
  };

  /** Lấy URL ảnh đại diện cho cột "Ảnh" */
  const coverUrl = (p: Product): string | undefined => {
    const pImg = (p as any).image as string | undefined;
    if (pImg) return toAssetUrl(pImg);

    const firstFromVariants =
      p.variants?.flatMap((v: any) => {
        const singles: (string | undefined)[] = [v?.image];
        const albums = safeParseImages(v?.images);
        return [...singles, ...albums];
      }) ?? [];
    const first = firstFromVariants.find((x) => !!x) as string | undefined;
    return toAssetUrl(first);
  };

  /** Album URLs */
  const albumUrls = (p: Product): string[] => {
    const allUrls: (string | undefined)[] = [
      toAssetUrl((p as any).image),
      ...(p.variants ?? []).flatMap((v: any) => {
        const single = v?.image ? [toAssetUrl(v.image)] : [];
        const many = safeParseImages(v?.images)
          .map(toAssetUrl)
          .filter(Boolean);
        return [...single, ...many];
      }),
    ];

    return unique(allUrls.filter((x): x is string => !!x)).slice(0, 12);
  };

  const columns: ColumnsType<Product> = [
    {
      title: "STT",
      width: 72,
      align: "center",
      render: (_: unknown, __: Product, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
      fixed: "left",
    },
    {
      title: "Mã",
      width: 180,
      render: (_: unknown, r: Product) => {
        if (r.sku) return r.sku;

        const variantSkus = (r.variants ?? [])
          .map((v: any) => v?.sku)
          .filter((s): s is string => !!s);

        if (variantSkus.length === 0) return "—";
        if (variantSkus.length === 1) return variantSkus[0];

        const [first, ...rest] = variantSkus;
        return (
          <Tooltip title={variantSkus.join(", ")}>
            {first} +{rest.length} mã
          </Tooltip>
        );
      },
    },
    {
      title: "Ảnh",
      dataIndex: "image",
      width: 100,
      render: (_: unknown, record: Product) => {
        const url = coverUrl(record);
        return url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: "cover", borderRadius: 6 }}
            alt={record.name}
            placeholder
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: "#f0f0f0",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#999",
            }}
          >
            N/A
          </div>
        );
      },
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Danh mục",
      dataIndex: "category_id",
      width: 200,
      render: (cid: number | null) => (cid != null ? catMap[cid] ?? "—" : "—"),
    },
    {
      title: "Biến thể",
      dataIndex: "variation_status",
      width: 120,
      align: "center",
      render: (val: number, r: Product) => {
        const count = r.variants?.length ?? 0;
        return val ? <Tag color="green">Có ({count})</Tag> : <Tag>Không</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "actions",
      width: 220,
      render: (_: unknown, record: Product) => (
        <Space wrap>
          <Button
            type="link"
            onClick={() => navigate(`/admin/products/${record.id}`)}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Space>
          <Input
            placeholder="Tìm theo mã (SKU) / tên…"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: 360 }}
          />
        </Space>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/admin/products/create")}
        >
          Thêm sản phẩm
        </Button>
      </div>

      <Table<Product>
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        expandable={{
          expandedRowRender: (record: Product) => (
            <div style={{ padding: 12 }}>
              {/* Album ảnh */}
              <Space wrap style={{ marginBottom: 12 }}>
                {albumUrls(record).map((url: string, idx: number) => (
                  <Image
                    key={`${record.id}-${idx}`}
                    src={url}
                    width={64}
                    height={64}
                    style={{ objectFit: "cover", borderRadius: 8 }}
                    alt={`${record.name}-img-${idx + 1}`}
                  />
                ))}
              </Space>

              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Brand">
                  {record.brand || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Xuất xứ">
                  {record.origin || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả" span={3}>
                  {record.description || "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Tạo lúc">
                  {dayjs(record.created_at).format("HH:mm - DD/MM/YYYY")}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật">
                  {dayjs(record.updated_at).format("HH:mm - DD/MM/YYYY")}
                </Descriptions.Item>
              </Descriptions>

              <div
                style={{
                  marginTop: 10,
                  padding: 16,
                  border: "1px solid #e0e0e0",
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  backgroundColor: "#fff",
                  display: "inline-block",
                }}
              >
                <Popconfirm
                  title="Lưu Trữ sản phẩm"
                  description="Bản ghi sẽ chuyển vào lưu trữ."
                  okText="Lưu Trữ"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(record.id)}
                >
                  <Button type="primary" danger style={{ borderRadius: 8 }}>
                    Chuyển vào lưu trữ
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ),
          rowExpandable: () => true,
        }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          onChange: (page) => setCurrentPage(page),
          showTotal: (t) => `Tổng ${t} sản phẩm`,
          showSizeChanger: false,
        }}
      />
    </div>
  );
};

export default ProductList;