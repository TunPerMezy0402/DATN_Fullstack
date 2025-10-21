// src/pages/admin/categories/CategoryTrash.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Space, Popconfirm, message, Input } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  deleted_at: string | null;
}

type SortOrder = "ascend" | "descend" | null;

const CategoryTrash: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ chỉ thêm 2 state phục vụ yêu cầu
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("descend"); // mặc định mới nhất trước

  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
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

  // ✅ lọc theo tên danh mục (đơn giản, không thêm tính năng khác)
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchText]);

  // ✅ sắp xếp theo "Ngày xóa" theo sortOrder hiện tại
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

  /** ♻️ Khôi phục */
  const handleRestore = async (id: number) => {
    try {
      await axios.post(
        `${API_URL}/admin/categories/${id}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("✅ Khôi phục danh mục thành công!");
      setCategories((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      message.error("Không thể khôi phục danh mục!");
    }
  };

  /** 🚮 Xóa vĩnh viễn */
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

  /** 🧱 Cột của bảng (gọn, không thêm gì ngoài sorter + arrow) */
  const columns: ColumnsType<Category> = [
    { title: "Tên danh mục", dataIndex: "name" },
    {
      title: "Ngày xóa",
      dataIndex: "deleted_at",
      sorter: true,          // bật sort để hiện mũi tên
      sortOrder,             // trỏ state để mũi tên phản ánh trạng thái
      sortDirections: ["descend", "ascend"],
      render: (text: string | null) =>
        text ? dayjs(text).format("HH:mm - DD/MM/YYYY") : "—",
      width: 200,
    },
    {
      title: "Hành động",
      render: (_: any, record: Category) => (
        <Space>
          <Popconfirm
            title="Xác nhận khôi phục ?"
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
      width: 240,
    },
  ];

  // ✅ cập nhật mũi tên khi user bấm tiêu đề "Ngày xóa"
  const handleTableChange: TableProps<Category>["onChange"] = (_p, _f, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortOrder((s?.order as SortOrder) ?? null);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🗑️ Danh mục đã xóa mềm</h2>
        <Space>
          {/* ✅ thanh tìm kiếm theo danh mục */}
          <Input.Search
            placeholder="Tìm theo tên danh mục…"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(val) => setSearchText(val)}
            style={{ width: 280 }}
          />
          <Button onClick={() => navigate("/admin/categories")}>
            ⬅️ Quay lại danh sách
          </Button>
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
