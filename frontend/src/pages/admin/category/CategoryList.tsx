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
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { SortDescendingOutlined } from "@ant-design/icons";

interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // 🔎 tìm kiếm + ⏱️ sắp xếp mới nhất
  const [searchText, setSearchText] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const [form] = Form.useForm();

  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

  // ✅ Lấy danh sách
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data =
        Array.isArray(res.data) ? res.data :
        Array.isArray(res.data.data) ? res.data.data :
        res.data.data?.data || [];

      setCategories(data);
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

  // ✅ Lọc + sắp xếp
  const dataView = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = categories.filter((c) => c.name.toLowerCase().includes(q));
    if (sortNewest) {
      list = [...list].sort(
        (a, b) => dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    }
    return list;
  }, [categories, searchText, sortNewest]);

  // ✅ Mở modal thêm/sửa
  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // ✅ Lưu
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingCategory) {
        await axios.put(`${API_URL}/admin/categories/${editingCategory.id}`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("✅ Cập nhật danh mục thành công!");
      } else {
        await axios.post(`${API_URL}/admin/categories`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("✅ Thêm danh mục thành công!");
      }
      setModalVisible(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      message.error("Không thể lưu danh mục!");
    }
  };

  // ✅ Xóa mềm
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

  const openDetailModal = (category: Category) => {
    setSelectedCategory(category);
    setDetailVisible(true);
  };

  const columns = [
    {
      title: "STT",
      render: (_: any, __: any, index: number) =>
        (currentPage - 1) * pageSize + index + 1,
      width: 80,
      align: "center" as const,
    },
    { title: "Tên danh mục", dataIndex: "name", key: "name" },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: Category) => (
        <Space>
          <Button type="link" onClick={() => openDetailModal(record)}>
            Chi tiết
          </Button>
          <Button type="link" onClick={() => openModal(record)}>
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
        {/* Trái: Tìm kiếm + Icon sắp xếp ngay cạnh */}
        <Space>
          <Input
            placeholder="Tìm theo tên danh mục..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={(e) =>
              setSearchText((e.target as HTMLInputElement).value)
            }
            allowClear
            style={{ width: 320 }}
          />

          <Tooltip
            title={
              sortNewest ? "Đang sắp xếp: Mới nhất" : "Bật sắp xếp theo Mới nhất"
            }
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

        {/* Phải: nút Thêm */}
        <Button type="primary" onClick={() => openModal()}>
          + Thêm danh mục
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataView}
        loading={loading}
        pagination={{
          pageSize,
          current: currentPage,
          onChange: (page: number) => setCurrentPage(page),
          showTotal: (t) => `Tổng ${t} danh mục`,
        }}
      />

      {/* Modal Thêm / Sửa */}
      <Modal
        title={editingCategory ? "📝 Chỉnh sửa danh mục" : "➕ Thêm danh mục"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[{ required: true, message: "Nhập tên danh mục!" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chi tiết */}
      <Modal
        title="📄 Chi tiết danh mục"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
      >
        {selectedCategory && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Tên">
              {selectedCategory.name}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedCategory.created_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày cập nhật">
              {dayjs(selectedCategory.updated_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default CategoryList;
