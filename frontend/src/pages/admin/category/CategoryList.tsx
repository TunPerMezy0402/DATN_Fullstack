import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Descriptions,
  Tooltip,
  Tag,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import {
  SortDescendingOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";

interface Category {
  id: number;
  name: string;
  image?: string | null;      // relative path (VD: "img/category/abc.jpg")
  image_url?: string | null;  // URL dùng được ngay (VD: "/storage/img/category/abc.jpg" hoặc full URL)
  created_at: string;
  updated_at: string;
}

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

const toImageUrl = (row: Partial<Category>) => {
  const raw = row.image_url || row.image || "";
  if (!raw) return "";
  // Nếu BE đã trả full http(s)
  if (/^https?:\/\//i.test(raw)) return raw;
  // Nếu bắt đầu bằng "/", ghép BACKEND_URL
  if (raw.startsWith("/")) return `${BACKEND_URL}${raw}`;
  // Còn lại là relative path trên disk 'public'
  return `${BACKEND_URL}/storage/${raw}`;
};

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState<"updated_at" | "name">("updated_at");
  const [ascending, setAscending] = useState<boolean>(false);

  const [form] = Form.useForm();
  const token = localStorage.getItem("access_token");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { per_page: 200 }, // lấy nhiều để client-side sort/paginate
      });

      // Chuẩn hoá data từ nhiều kiểu trả về (paginator hoặc array)
      const raw =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data?.data?.data)
              ? res.data.data.data
              : [];

      setCategories(raw);
    } catch (err) {
      console.error("❌ Lỗi tải danh mục:", err);
      message.error("Không thể tải danh mục!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSorted = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = categories.filter((c) => c.name.toLowerCase().includes(q));

    if (sortKey === "updated_at") {
      list = [...list].sort((a, b) =>
        ascending
          ? dayjs(a.updated_at).valueOf() - dayjs(b.updated_at).valueOf()
          : dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    } else {
      list = [...list].sort((a, b) =>
        ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
    }
    return list;
  }, [categories, searchText, sortKey, ascending]);

  const openDetailModal = (category: Category) => {
    setSelectedCategory(category);
    setDetailVisible(true);
  };

  const handleSoftDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("🗑️ Đã xóa mềm danh mục!");
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa danh mục!");
    }
  };

  const columns = [
    {
      title: "STT",
      width: 80,
      align: "center" as const,
      render: (_: any, __: any, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: "Hình ảnh",
      dataIndex: "image_url",
      key: "image_url",
      render: (_: any, record: Category) => {
        const src = toImageUrl(record);
        return src ? (
          <img
            src={src}
            alt={record.name}
            style={{
              width: 50,
              height: 50,
              objectFit: "cover",
              borderRadius: "50%",
            }}
            onError={(e: any) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <Tag color="default">Không có ảnh</Tag>
        );
      },
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: Category) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="link"
              onClick={() => openDetailModal(record)}
            >
              Chi tiết
            </Button>
          </Tooltip>
          <Button type="link" href={`/admin/categories/${record.id}/edit`}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa danh mục"
            description="Bản ghi sẽ chuyển vào Thùng rác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleSoftDelete(record.id)}
          >
            <Button danger type="link">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header bar */}
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
        <Space wrap>
          <Input
            placeholder="Tìm theo tên danh mục..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 320 }}
          />
          {/* Nút/chế độ sắp xếp */}
          <Tooltip
            title={
              sortKey === "updated_at"
                ? ascending
                  ? "Sắp xếp: Cũ nhất trước"
                  : "Sắp xếp: Mới nhất trước"
                : ascending
                  ? "Sắp xếp tên: A → Z"
                  : "Sắp xếp tên: Z → A"
            }
          >
            <Button
              size="small"
              shape="circle"
              type={sortKey === "updated_at" ? "primary" : "default"}
              icon={<SortDescendingOutlined />}
              aria-label="Sắp xếp theo ngày cập nhật"
              onClick={() => {
                setSortKey("updated_at");
                setAscending((v) => !v);
              }}
            />
          </Tooltip>

          {/*           <Tooltip title="Sắp xếp theo tên (A/Z – nhấn để đảo chiều)">
            <Button
              size="small"
              shape="circle"
              type={sortKey === "name" ? "primary" : "default"}
              icon={<SortAscendingOutlined />}
              aria-label="Sắp xếp theo tên"
              onClick={() => {
                setSortKey("name");
                setAscending((v) => !v);
              }}
            />
          </Tooltip>

          <Tooltip title="Tải lại">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchCategories}
            />
          </Tooltip> */}
        </Space>

        <Button type="primary" href="/admin/categories/create">
          + Thêm danh mục
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredSorted}
        loading={loading}
        pagination={{
          pageSize,
          current: currentPage,
          onChange: (page: number) => setCurrentPage(page),
          showTotal: (t) => `Tổng ${t} danh mục`,
        }}
      />

      {/* Modal Chi tiết */}
      <Modal
        title="📄 Chi tiết danh mục"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
      >
        {selectedCategory && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Tên">
              {selectedCategory.name}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedCategory.created_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày cập nhật">
              {dayjs(selectedCategory.updated_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Hình ảnh">
              {toImageUrl(selectedCategory) ? (
                <img
                  src={toImageUrl(selectedCategory)}
                  alt={selectedCategory.name}
                  style={{ width: "100%", maxHeight: 360, objectFit: "contain" }}
                />
              ) : (
                <Tag color="default">Không có ảnh</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default CategoryList;
