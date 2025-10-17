import React, { useEffect, useState } from "react";
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
} from "antd";
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
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [form] = Form.useForm();
  const pageSize = 10;
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

  // ✅ Lấy danh sách danh mục
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
  }, []);

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

  // ✅ Lưu danh mục (Thêm / Sửa)
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

  // ✅ Xóa mềm danh mục
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
      render: (_: any, __: any, index: number) => (currentPage - 1) * pageSize + index + 1,
    },
    { title: "Tên danh mục", dataIndex: "name", key: "name" },
    { title: "Mô tả", dataIndex: "description", key: "description" },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      render: (text: string) => dayjs(text).format("HH:mm - DD/MM/YYYY"),
    },
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
            okText="Xóa"
            cancelText="Hủy"
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

  const openDetailModal = (category: Category) => {
    setSelectedCategory(category);
    setDetailVisible(true);
  };

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h2>📁 Danh sách danh mục</h2>
        <Space>
          <Button onClick={() => navigate("/admin/categories/trash")} danger>
            🗑️ Danh sách đã xóa
          </Button>
          <Button type="primary" onClick={() => openModal()}>
            + Thêm danh mục
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={categories}
        loading={loading}
        pagination={{
          pageSize,
          onChange: (page: number) => setCurrentPage(page),
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
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} />
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
            <Descriptions.Item label="Tên">{selectedCategory.name}</Descriptions.Item>
            <Descriptions.Item label="Mô tả">{selectedCategory.description}</Descriptions.Item>
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
