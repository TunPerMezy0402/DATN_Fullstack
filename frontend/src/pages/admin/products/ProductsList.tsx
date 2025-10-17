import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Spin, message, Popconfirm, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getProducts, deleteProduct } from "../../../services/productService";

interface Product {
  id: number;
  name: string;
  category_id?: number | null;
  description?: string | null;
  origin?: string | null;
  brand?: string | null;
  price: number | string | null;
  discount_price?: number | string | null;
  stock_quantity: number;
  images?: string[] | string | null;   // 👈 thêm images
  created_at?: string;
}

// Sửa URL này nếu backend khác:
const FILE_BASE_URL = "http://localhost:8000/storage/";

const currencyVN = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

// Chuẩn hoá mảng ảnh về string[]
const toImageArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // có thể là chuỗi JSON hoặc chuỗi "a.jpg,b.jpg"
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(val)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

// Build URL ảnh đầy đủ
const getThumbUrl = (path?: string) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  // giả định file nằm trong storage/public
  return FILE_BASE_URL + path.replace(/^\/+/, "");
};

const ProductsList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizeList = (payload: any): Product[] => {
    const raw = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.results)
      ? payload.results
      : [];

    return raw.map((p: any) => ({
      ...p,
      price: p?.price != null ? Number(p.price) : null,
      discount_price: p?.discount_price != null ? Number(p.discount_price) : null,
      stock_quantity: p?.stock_quantity != null ? Number(p.stock_quantity) : 0,
      images: toImageArray(p?.images),
    }));
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProducts(); // /api/admin/products
      const list = normalizeList(res?.data);
      setProducts(list);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách sản phẩm");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct(id);
      message.success("Đã xóa sản phẩm");
      fetchProducts();
    } catch (error) {
      console.error(error);
      message.error("Xóa thất bại");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const columns: ColumnsType<Product> = [
    { title: "ID", dataIndex: "id", key: "id", width: 70 },
    {
      title: "Ảnh",
      key: "thumb",
      width: 80,
      render: (_: any, r) => {
        const first = Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : "";
        const url = getThumbUrl(first);
        return url ? (
          <img
            src={url}
            alt={r.name}
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              background: "#f0f0f0",
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
    { title: "Tên sản phẩm", dataIndex: "name", key: "name" },
    { title: "Thương hiệu", dataIndex: "brand", key: "brand", render: (v) => v || "-" },
    { title: "Xuất xứ", dataIndex: "origin", key: "origin", render: (v) => v || "-" },
    {
      title: "Giá",
      key: "price",
      align: "right",
      render: (_: any, r) => {
        const base = Number(r.price);
        const sale = r.discount_price != null ? Number(r.discount_price) : NaN;
        if (Number.isFinite(sale) && sale >= 0 && Number.isFinite(base) && sale < base) {
          const off = Math.round(((base - sale) / base) * 100);
          return (
            <div style={{ textAlign: "right" }}>
              <div style={{ textDecoration: "line-through", opacity: 0.6 }}>
                {currencyVN.format(base)}
              </div>
              <div style={{ fontWeight: 600 }}>{currencyVN.format(sale)}</div>
              <Tag color="red">-{off}%</Tag>
            </div>
          );
        }
        return Number.isFinite(base) ? currencyVN.format(base) : "-";
      },
    },
    {
      title: "Kho",
      dataIndex: "stock_quantity",
      key: "stock_quantity",
      width: 90,
      align: "right",
      render: (v: number) => (Number.isFinite(v) ? v : 0),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (v?: string) => {
        if (!v) return "-";
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? v : d.toLocaleString("vi-VN");
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 170,
      render: (_: any, record) => (
        <>
          <Button
            type="link"
            onClick={() => (window.location.href = `/admin/products/edit/${record.id}`)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa sản phẩm?"
            description={`Bạn chắc chắn muốn xóa #${record.id}?`}
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger>
              Xóa
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>Danh sách sản phẩm</h2>
      {loading ? (
        <Spin />
      ) : (
        <Table<Product>
          dataSource={products}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      )}
    </div>
  );
};

export default ProductsList;
