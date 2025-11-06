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

interface Attribute {
  id: number;
  type: string;
  value: string;
  created_at: string;
  updated_at: string;
}

const AttributeList: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [selectedAttr, setSelectedAttr] = useState<Attribute | null>(null);

  const [searchText, setSearchText] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const [form] = Form.useForm();

  const token = localStorage.getItem("access_token");
  const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
  const headers = { Authorization: `Bearer ${token}` };

  // 🔹 Hàm hiển thị lỗi chi tiết
  const showError = (err: any, defaultMsg: string) => {
    if (axios.isAxiosError(err)) {
      const apiMsg =
        err.response?.data?.message || JSON.stringify(err.response?.data) || err.message;
      console.error("❌ Lỗi Axios:", err.response?.data || err.message);
      message.error(`${defaultMsg}: ${apiMsg}`);
    } else {
      console.error("❌ Lỗi không xác định:", err);
      message.error(`${defaultMsg}: Lỗi không xác định`);
    }
  };

  // ✅ Lấy danh sách thuộc tính
  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/attributes`, { headers });
      const data =
        Array.isArray(res.data) ? res.data :
        Array.isArray(res.data.data) ? res.data.data :
        res.data.data?.data || [];
      setAttributes(data);
    } catch (err) {
      showError(err, "Không thể tải thuộc tính");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Lọc + sắp xếp
  const dataView = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = attributes.filter((a) => a.type.toLowerCase().includes(q));
    if (sortNewest) {
      list = [...list].sort(
        (a, b) => dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    }
    return list;
  }, [attributes, searchText, sortNewest]);

  // ✅ Mở modal thêm/sửa
  const openModal = (attr?: Attribute) => {
    if (attr) {
      setEditingAttr(attr);
      form.setFieldsValue({ type: attr.type, value: attr.value });
    } else {
      setEditingAttr(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 🔹 Chuẩn hóa chữ cái đầu viết hoa, còn lại viết thường
  const normalizeValue = (value: string) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  // ✅ Lưu (Thêm / Sửa) với hiển thị lỗi chi tiết và chuẩn hóa value
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      values.value = normalizeValue(values.value);

      if (editingAttr) {
        await axios.put(`${API_URL}/admin/attributes/${editingAttr.id}`, values, { headers });
        message.success("✅ Cập nhật thuộc tính thành công!");
      } else {
        await axios.post(`${API_URL}/admin/attributes`, values, { headers });
        message.success("✅ Thêm thuộc tính thành công!");
      }
      setModalVisible(false);
      fetchAttributes();
    } catch (err) {
      showError(err, "Không thể lưu thuộc tính");
    }
  };

  // ✅ Xóa mềm với hiển thị lỗi chi tiết
  const handleSoftDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/attributes/${id}`, { headers });
      message.success("🗑️ Đã xóa mềm thuộc tính!");
      fetchAttributes();
    } catch (err) {
      showError(err, "Không thể xóa thuộc tính");
    }
  };

  const openDetailModal = (attr: Attribute) => {
    setSelectedAttr(attr);
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
    { title: "Tên thuộc tính", dataIndex: "type", key: "type" },
    { title: "Giá trị", dataIndex: "value", key: "value" },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      render: (text: string) => dayjs(text).format("HH:mm - DD/MM/YYYY"),
      width: 180,
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: Attribute) => (
        <Space>
          <Button type="link" onClick={() => openDetailModal(record)}>
            Chi tiết
          </Button>
          <Button type="link" onClick={() => openModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa thuộc tính"
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
        <Space>
          <Input
            placeholder="Tìm theo tên thuộc tính..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
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
              onClick={() => setSortNewest((v) => !v)}
            />
          </Tooltip>
        </Space>
        <Button type="primary" onClick={() => openModal()}>
          + Thêm thuộc tính
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
          showTotal: (t) => `Tổng ${t} thuộc tính`,
        }}
      />

      {/* Modal Thêm / Sửa */}
      <Modal
        title={editingAttr ? "📝 Chỉnh sửa thuộc tính" : "➕ Thêm thuộc tính"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Tên thuộc tính (type)"
            name="type"
            rules={[{ required: true, message: "Nhập tên thuộc tính!" }]}
          >
            <Input placeholder="Ví dụ: color, size..." />
          </Form.Item>
          <Form.Item
            label="Giá trị"
            name="value"
            rules={[{ required: true, message: "Nhập giá trị!" }]}
          >
            <Input placeholder="Ví dụ: Red, Xl..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chi tiết */}
      <Modal
        title="📄 Chi tiết thuộc tính"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
      >
        {selectedAttr && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Tên thuộc tính">
              {selectedAttr.type}
            </Descriptions.Item>
            <Descriptions.Item label="Giá trị">
              {selectedAttr.value}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedAttr.created_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày cập nhật">
              {dayjs(selectedAttr.updated_at).format("HH:mm - DD/MM/YYYY")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default AttributeList;
