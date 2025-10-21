// src/pages/admin/categories/CategoryTrash.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Space, Popconfirm, message, Input, Tag } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  deleted_at: string | null;
  image?: string | null;      // vd: "storage/img/category/xxx.jpg"
  image_url?: string | null;  // vd: "http://127.0.0.1:8000/storage/img/category/xxx.jpg"
}

type SortOrder = "ascend" | "descend" | null;

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

const toImageUrl = (row: Partial<Category>) => {
  const raw = row.image_url || row.image || "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;           // đã là full URL
  if (raw.startsWith("/")) return `${BACKEND_URL}${raw}`; // bắt đầu bằng '/'
  return `${BACKEND_URL}/${raw}`;                      // relative (vd: storage/img/category/...)
};

const CategoryTrash: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("descend"); // mặc định: mới xóa trước

  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  const fetchTrashed = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/categories/trash`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data?.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách danh mục đã xóa mềm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lọc theo tên
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchText]);

  // sắp xếp theo deleted_at
  const dataView = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const aT = a.deleted_at ? dayjs(a.deleted_at).valueOf() : -Infinity;
      const bT = b.deleted_at ? dayjs(b.deleted_at).valueOf() : -Infinity;
      const diff = aT - bT;
      return sortOrder === "ascend" ? diff : -diff;
    });
    return list;
  }, [filtered, sortOrder]);

  // khôi phục
  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${API_URL}/admin/categories/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("✅ Khôi phục danh mục thành công!");
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      message.error("Không thể khôi phục danh mục!");
    }
  };

  // xóa vĩnh viễn
  const handleForceDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/categories/${id}/force-delete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("🗑️ Đã xóa vĩnh viễn danh mục!");
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa vĩnh viễn!");
    }
  };

  // cột bảng
  const columns: ColumnsType<Category> = [
    {
      title: "Hình ảnh",
      dataIndex: "image",
      key: "image",
      width: 90,
      render: (_: any, record) => {
        const src = toImageUrl(record);
        return src ? (
          <img
            src={src}
            alt={record.name}
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "50%" }}
            onError={(e: any) => (e.currentTarget.style.visibility = "hidden")}
          />
        ) : (
          <Tag color="default">—</Tag>
        );
      },
    },
    { title: "Tên danh mục", dataIndex: "name", key: "name" },
    {
      title: "Ngày xóa",
      dataIndex: "deleted_at",
      sorter: true,
      sortOrder,
      sortDirections: ["descend", "ascend"],
      width: 200,
      render: (text: string | null) => (text ? dayjs(text).format("HH:mm - DD/MM/YYYY") : "—"),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 260,
      render: (_: any, record) => (
        <Space>
          <Popconfirm
            title="Xác nhận khôi phục?"
            okText="Khôi phục"
            cancelText="Hủy"
            onConfirm={() => handleRestore(record.id)}
          >
            <Button type="link">♻️ Khôi phục</Button>
          </Popconfirm>
          <Popconfirm
            title="Xác nhận xóa vĩnh viễn?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleForceDelete(record.id)}
          >
            <Button danger type="link">🚮 Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // cập nhật mũi tên sort khi user click tiêu đề "Ngày xóa"
  const handleTableChange: TableProps<Category>["onChange"] = (_p, _f, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortOrder((s?.order as SortOrder) ?? null);
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>🗑️ Danh mục đã xóa mềm</h2>
        <Space>
          <Input.Search
            placeholder="Tìm theo tên danh mục…"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(val) => setSearchText(val)}
            style={{ width: 280 }}
          />
          <Button onClick={() => navigate("/admin/categories")}>⬅️ Quay lại danh sách</Button>
        </Space>
      </div>

      <Table<Category>
        rowKey="id"
        columns={columns}
        dataSource={dataView}
        loading={loading}
        bordered
        onChange={handleTableChange}
        pagination={{
          pageSize: 10,
          showTotal: (t) => `Tổng ${t} danh mục`,
        }}
      />
    </div>
  );
};

export default CategoryTrash;
