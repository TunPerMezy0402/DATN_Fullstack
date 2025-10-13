import React, { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, message, Tag } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  // ✅ Lấy danh sách
  const fetchCategories = () => {
    setLoading(true);
    axios
      .get("http://127.0.0.1:8000/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("✅ API response:", res.data);
        let list: any[] = [];

        if (Array.isArray(res.data)) list = res.data;
        else if (Array.isArray(res.data.data)) list = res.data.data;
        else if (res.data.data && Array.isArray(res.data.data.data))
          list = res.data.data.data;

        setCategories(list);
      })
      .catch((err) => {
        console.error("❌ Lỗi:", err);
        message.error("Không thể tải danh mục!");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Hàm xoá danh mục
  const handleDelete = (id: number) => {
    axios
      .delete(`http://127.0.0.1:8000/api/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        message.success("🗑️ Xóa danh mục thành công!");
        setCategories((prev) => prev.filter((c) => c.id !== id));
      })
      .catch((err) => {
        console.error("❌ Lỗi xoá:", err);
        message.error("Không thể xóa danh mục!");
      });
  };

  // ✅ Cột hiển thị
  const columns = [
    {
      title: "STT",
      key: "index",
      align: "center" as const,
      render: (_: any, __: any, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>{name}</span>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (text: string) => (
        <span style={{ color: "#666" }}>{text || "Không có mô tả"}</span>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (text: string) => (
        <span>{dayjs(text).format("HH:mm - DD/MM/YYYY")}</span>
      ),
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (text: string) => (
        <span>{dayjs(text).format("HH:mm - DD/MM/YYYY")}</span>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      align: "center" as const,
      render: (_: any, record: Category) => (
        <Space>
          <Button
            type="link"
            style={{ color: "#52c41a" }}
            onClick={() => navigate(`/admin/categories/${record.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title="Xóa danh mục"
            description="Bạn có chắc chắn muốn xóa danh mục này không?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ✅ Giao diện
  return (
    <div
      style={{
        padding: 24,
        background: "#f5f7fa",
        borderRadius: 12,
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, color: "#1890ff" }}>📁 Danh sách danh mục</h2>
        <Button
          type="primary"
          onClick={() => navigate("/admin/categories/create")}
          style={{
            background: "linear-gradient(90deg, #1890ff, #40a9ff)",
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          + Thêm danh mục
        </Button>
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={categories}
          loading={loading}
          pagination={{
            pageSize,
            onChange: (page) => setCurrentPage(page),
          }}
          bordered
        />
      </div>
    </div>
  );
};
export default CategoryList;
