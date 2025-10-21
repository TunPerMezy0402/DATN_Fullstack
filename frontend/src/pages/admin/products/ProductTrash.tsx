// src/pages/admin/products/ProductTrash.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Table, Button, Space, Popconfirm, message, Input, Tag, Tooltip, Image, Descriptions
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, SortDescendingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  Product, Category, fetchCategories, fetchTrashedProducts,
  restoreProduct, forceDeleteProduct
} from "../../../api/productApi";

const pageSize = 10;

/* ============================== URL helper ============================== */
// API_URL lấy từ env → bỏ đuôi /api để ra origin backend: http://127.0.0.1:8000
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

// v.images có thể là mảng, string JSON, hoặc string URL đơn
const parseVariantImages = (val: any): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    try {
      const maybe = JSON.parse(val);
      if (Array.isArray(maybe)) return maybe.filter(Boolean);
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
};
const unique = <T,>(arr: T[]) => Array.from(new Set(arr));

/* Kiểu hàng dùng trong bảng: bảo đảm có 'image' (string) */
type ProdRow = Product & {
  image?: string | null;
  variants?: Array<{ image?: string | null; images?: string[] | string | null; sku?: string | null }>;
};

const ProductTrash: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProdRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catMap, setCatMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [searchText, setSearchText] = useState<string>("");
  const [sortNewest, setSortNewest] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cats, trashed] = await Promise.all([fetchCategories(), fetchTrashedProducts()]);
      setCategories(cats);
      setProducts((Array.isArray(trashed) ? trashed : []) as unknown as ProdRow[]);
      const map: Record<number, string> = {};
      cats.forEach((c) => { if (c?.id != null) map[c.id] = c.name; });
      setCatMap(map);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải danh sách lưu trữ!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const dataView = useMemo<ProdRow[]>(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = q
      ? products.filter((p) => {
          const byName = (p.name ?? "").toLowerCase().includes(q);
          const byProductSku = (p.sku ?? "").toLowerCase().includes(q);
          const byVariantSku =
            Array.isArray(p.variants) && p.variants.some(v => (v?.sku ?? "").toLowerCase().includes(q));
          return byName || byProductSku || byVariantSku;
        })
      : products;

    return sortNewest
      ? [...filtered].sort(
          (a, b) =>
            dayjs((b as any).deleted_at ?? b.updated_at).valueOf() -
            dayjs((a as any).deleted_at ?? a.updated_at).valueOf()
        )
      : filtered;
  }, [products, searchText, sortNewest]);

  const onRestore = async (id: number) => {
    try {
      await restoreProduct(id);
      message.success("✅ Đã khôi phục sản phẩm!");
      loadAll();
    } catch (e) {
      console.error(e);
      message.error("Không thể khôi phục sản phẩm!");
    }
  };

  const onForceDelete = async (id: number) => {
    try {
      await forceDeleteProduct(id);
      message.success("🗑️ Đã xóa vĩnh viễn!");
      loadAll();
    } catch (e) {
      console.error(e);
      message.error("Không thể xóa vĩnh viễn!");
    }
  };

  /** Ảnh cột “Ảnh”: ưu tiên product.image; nếu rỗng → lấy ảnh đầu tiên từ biến thể */
  const coverUrl = (p: ProdRow): string | undefined => {
    if (p.image) return toAssetUrl(p.image);
    const flat = (p.variants ?? []).flatMap((v) => [v?.image, ...parseVariantImages(v?.images)]);
    const first = flat.find(Boolean) as string | undefined;
    return toAssetUrl(first);
  };

  /** Album (expand): gồm product.image + tất cả ảnh biến thể (image + images[]) */
  const albumUrls = (p: ProdRow): string[] =>
    unique(
      [
        toAssetUrl(p.image),
        ...(p.variants ?? []).flatMap((v) => {
          const solo = v?.image ? [toAssetUrl(v.image)] : [];
          const many = parseVariantImages(v?.images).map(toAssetUrl);
          return [...(solo as (string | undefined)[]), ...many];
        }),
      ].filter(Boolean) as string[]
    ).slice(0, 12);

  const columns: ColumnsType<ProdRow> = [
    {
      title: "STT",
      width: 72,
      align: "center",
      render: (_: unknown, _r: ProdRow, i: number) => (currentPage - 1) * pageSize + i + 1,
      fixed: "left",
    },
    {
      title: "Mã",
      width: 180,
      render: (_: unknown, r: ProdRow) => {
        if (r.sku) return r.sku;
        const variantSkus = (r.variants ?? [])
          .map((v) => v?.sku)
          .filter((s): s is string => !!s);
        if (variantSkus.length === 0) return "—";
        if (variantSkus.length === 1) return variantSkus[0];
        const [first, ...rest] = variantSkus;
        return <Tooltip title={variantSkus.join(", ")}>{first} +{rest.length} mã</Tooltip>;
      },
    },
    {
      title: "Ảnh",
      dataIndex: "image",
      width: 100,
      render: (_: unknown, r: ProdRow) => {
        const url = coverUrl(r);
        return url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: "cover", borderRadius: 6 }}
            alt={r.name}
          />
        ) : (
          <div
            style={{
              width: 60, height: 60, background: "#f0f0f0", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#999",
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
      render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span>,
    },
    {
      title: "Danh mục",
      dataIndex: "category_id",
      width: 200,
      render: (cid: number | null) => (cid != null ? (catMap[cid] ?? "—") : "—"),
    },
    {
      title: "Biến thể",
      dataIndex: "variation_status",
      width: 120,
      align: "center",
      render: (val: number, r: ProdRow) =>
        val ? <Tag color="green">Có ({r.variants?.length ?? 0})</Tag> : <Tag>Không</Tag>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 160,
      render: (_: unknown, r: ProdRow) => (
        <Button type="link" onClick={() => navigate(`/admin/products/${r.id}`)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap",
          alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/products")}>
            Quay lại danh sách
          </Button>
          <Input
            placeholder="Tìm theo mã (SKU) / tên…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={(e) => setSearchText((e.target as HTMLInputElement).value)}
            allowClear
            style={{ width: 360 }}
          />
          <Tooltip title={sortNewest ? "Đang sắp xếp: Mới xóa gần đây" : "Bật sắp xếp theo mới xóa"}>
            <Button
              size="small"
              shape="circle"
              type={sortNewest ? "primary" : "default"}
              icon={<SortDescendingOutlined />}
              onClick={() => setSortNewest((v) => !v)}
            />
          </Tooltip>
        </Space>
      </div>

      <Table<ProdRow>
        rowKey="id"
        columns={columns}
        dataSource={dataView}
        loading={loading}
        expandable={{
          expandedRowRender: (r) => (
            <div style={{ padding: 12 }}>

              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Brand">{(r as any).brand || "—"}</Descriptions.Item>
                <Descriptions.Item label="Xuất xứ">{(r as any).origin || "—"}</Descriptions.Item>
                <Descriptions.Item label="Mô tả" span={3}>{(r as any).description || "—"}</Descriptions.Item>
              </Descriptions>

              <Descriptions bordered size="small" column={3} style={{ marginTop: 8 }}>
                <Descriptions.Item label="Tạo lúc">
                  {r.created_at ? dayjs(r.created_at).format("HH:mm - DD/MM/YYYY") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật">
                  {r.updated_at ? dayjs(r.updated_at).format("HH:mm - DD/MM/YYYY") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Đã xóa lúc">
                  {(r as any).deleted_at ? dayjs((r as any).deleted_at).format("HH:mm - DD/MM/YYYY") : "—"}
                </Descriptions.Item>
              </Descriptions>

              <div
                style={{
                  margin: 12,
                  padding: 16,
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
                  background: "#fff",
                  display: "inline-flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <Popconfirm
                  title="Khôi phục sản phẩm"
                  description="Bản ghi sẽ được khôi phục lại."
                  okText="Khôi phục"
                  cancelText="Hủy"
                  onConfirm={() => onRestore(r.id)}
                >
                  <Button type="primary" style={{ borderRadius: 8 }}>
                    Khôi phục
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Xóa vĩnh viễn"
                  description="Thao tác này không thể hoàn tác!"
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onForceDelete(r.id)}
                >
                  <Button type="primary" danger style={{ borderRadius: 8 }}>
                    Xóa vĩnh viễn
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ),
          rowExpandable: () => true,
        }}
        pagination={{
          pageSize,
          current: currentPage,
          onChange: (p) => setCurrentPage(p),
          showTotal: (t) => `Tổng ${t} sản phẩm đã xóa`,
        }}
      />
    </div>
  );
};

export default ProductTrash;
