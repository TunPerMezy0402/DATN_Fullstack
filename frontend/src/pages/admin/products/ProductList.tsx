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
  fetchProducts,
  fetchCategories,
  deleteProduct,
  firstImage,
  parseImages,
  toCurrency,
} from "../../../api/productApi";

const pageSize = 10;

const ProductList: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catMap, setCatMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // tìm kiếm + sắp xếp + phân trang
  const [searchText, setSearchText] = useState<string>("");
  const [sortNewest, setSortNewest] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      setCategories(cats);
      setProducts(Array.isArray(prods) ? prods : []);

      const map: Record<number, string> = {};
      cats.forEach((c: Category) => {
        if (c?.id != null) map[c.id] = c.name;
      });
      setCatMap(map);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải dữ liệu sản phẩm/ danh mục!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ====== CHỈ TÌM THEO MÃ (SKU) VÀ TÊN ======
  const dataView = useMemo<Product[]>(() => {
    const q = searchText.trim().toLowerCase();

    const filtered = q
      ? products.filter((p) => {
          const byName = p.name.toLowerCase().includes(q);
          const byProductSku = (p.sku ?? "").toLowerCase().includes(q);
          const byVariantSku =
            Array.isArray(p.variants) &&
            p.variants.some((v) => (v.sku ?? "").toLowerCase().includes(q));
          return byName || byProductSku || byVariantSku;
        })
      : products;

    return sortNewest
      ? [...filtered].sort(
          (a, b) => dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
        )
      : filtered;
  }, [products, searchText, sortNewest]);

  const onDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      message.success("🗑️ Đã xóa mềm sản phẩm!");
      loadAll();
    } catch (e) {
      console.error(e);
      message.error("Không thể xóa sản phẩm!");
    }
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
    // ===== CỘT MÃ: Ưu tiên product.sku; nếu trống, gom SKU của biến thể =====
    {
      title: "Mã",
      width: 180,
      render: (_: unknown, r: Product) => {
        if (r.sku) return r.sku;

        const variantSkus = (r.variants ?? [])
          .map((v) => v.sku)
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
      dataIndex: "images",
      width: 100,
      render: (_: unknown, record: Product) => {
        const url = firstImage(record.images);
        return url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: "cover", borderRadius: 6 }}
            alt={record.name}
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
            onClick={() => navigate(`/admin/products/${record.id}/edit`)}
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header: Search + sort icon + Add */}
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
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={(e) =>
              setSearchText((e.target as HTMLInputElement).value)
            }
            allowClear
            style={{ width: 360 }}
          />
          <Tooltip
            title={sortNewest ? "Đang sắp xếp: Mới nhất" : "Bật sắp xếp theo Mới nhất"}
          >
            <Button
              size="small"
              shape="circle"
              type={sortNewest ? "primary" : "default"}
              icon={<SortDescendingOutlined />}
              aria-label="Sắp xếp theo mới nhất"
              onClick={() => setSortNewest((v) => !v)}
            />
          </Tooltip>
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
        dataSource={dataView}
        loading={loading}
        expandable={{
          // DẤU CỘNG mở chi tiết sản phẩm (brand, origin, mô tả, album ảnh…)
          expandedRowRender: (record: Product) => (
            <div style={{ padding: 12 }}>
              {/* Album ảnh */}
              <Space wrap style={{ marginBottom: 12 }}>
                {parseImages(record.images)
                  .slice(0, 8)
                  .map((url: string, idx: number) => (
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
{/*                 <Descriptions.Item label="Biến thể">
                  {record.variation_status ? (
                    <Tag color="green">Có ({record.variants?.length ?? 0})</Tag>
                  ) : (
                    <Tag>Không</Tag>
                  )}
                </Descriptions.Item> */}
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
          // vẫn cho expand kể cả không có biến thể — cần xem brand/description
          rowExpandable: () => true,
        }}
        pagination={{
          pageSize,
          current: currentPage,
          onChange: (p) => setCurrentPage(p),
          showTotal: (t) => `Tổng ${t} sản phẩm`,
        }}
      />
    </div>
  );
};

export default ProductList;
