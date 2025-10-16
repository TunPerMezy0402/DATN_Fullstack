import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  message,
  Input,
  Card,
  Typography,
  Spin,
  Button,
  Space,
  Modal,
  Form,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

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
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const API_URL = "http://127.0.0.1:8000/api";
  const token = localStorage.getItem("access_token");

  // ✅ Lấy danh sách thuộc tính
  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/attributes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res?.data?.data?.data || res?.data?.data || [];
      setAttributes(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách thuộc tính!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const filteredData = attributes.filter(
    (item) =>
      item.type.toLowerCase().includes(searchText.toLowerCase()) ||
      item.value.toLowerCase().includes(searchText.toLowerCase())
  );

  // ✅ Mở modal thêm/sửa
  const openModal = (attribute?: Attribute) => {
    if (attribute) {
      setEditingAttribute(attribute);
      form.setFieldsValue({
        type: attribute.type,
        value: attribute.value,
      });
    } else {
      setEditingAttribute(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // ✅ Mở modal chi tiết
  const openDetailModal = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
    setDetailVisible(true);
  };

  // ✅ Lưu thuộc tính (Thêm/Sửa)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingAttribute) {
        // Sửa
        await axios.put(`${API_URL}/admin/attributes/${editingAttribute.id}`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("✅ Cập nhật thuộc tính thành công!");
      } else {
        // Thêm
        await axios.post(`${API_URL}/admin/attributes`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("✅ Thêm thuộc tính thành công!");
      }
      setModalVisible(false);
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Không thể lưu thuộc tính!");
    }
  };

  // ✅ Xóa thuộc tính
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/admin/attributes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("🗑️ Xóa thuộc tính thành công!");
      fetchAttributes();
    } catch (err) {
      console.error(err);
      message.error("Không thể xóa thuộc tính!");
    }
  };

  // ✅ Cột Table
  const columns = [
    { title: "ID", dataIndex: "id", width: 70, align: "center" as const },
    { title: "Loại thuộc tính", dataIndex: "type", render: (type: string) => <Tag color="blue">{type}</Tag>, align: "center" as const },
    { title: "Giá trị", dataIndex: "value", align: "center" as const },
    { title: "Ngày tạo", dataIndex: "created_at", render: (date: string) => dayjs(date).format("HH:mm DD/MM/YYYY"), align: "center" as const },
    { title: "Ngày cập nhật", dataIndex: "updated_at", render: (date: string) => dayjs(date).format("HH:mm DD/MM/YYYY"), align: "center" as const },
    {
      title: "Hành động",
      render: (_: any, record: Attribute) => (
        <Space>
          <Button type="link" onClick={() => openDetailModal(record)}>Chi tiết</Button>
          <Button type="link" onClick={() => openModal(record)}>Sửa</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>Xóa</Button>
        </Space>
      ),
      align: "center" as const,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card className="shadow-md rounded-2xl bg-white">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between mb-6" style={{ gap: 20 }}>
          <div className="flex items-center gap-4">
            <Title level={4} style={{ margin: 0 }}>🧩 Danh sách thuộc tính</Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm thuộc tính</Button>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Tìm theo loại hoặc giá trị..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchAttributes}>Làm mới</Button>
          </div>
        </div>

        {/* Table */}
        <Spin spinning={loading} tip="Đang tải dữ liệu...">
          <Table
            bordered
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 5, showTotal: total => `Tổng ${total} thuộc tính` }}
          />
        </Spin>
      </Card>

      {/* Modal Thêm/Sửa */}
      <Modal
        title={editingAttribute ? "📝 Chỉnh sửa thuộc tính" : "➕ Thêm thuộc tính"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Loại thuộc tính" name="type" rules={[{ required: true, message: "Vui lòng nhập loại thuộc tính!" }]}>
            <Input placeholder="Nhập loại thuộc tính" />
          </Form.Item>
          <Form.Item label="Giá trị" name="value" rules={[{ required: true, message: "Vui lòng nhập giá trị!" }]}>
            <Input placeholder="Nhập giá trị" />
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
        {selectedAttribute ? (
          <div>
            <p><strong>ID:</strong> {selectedAttribute.id}</p>
            <p><strong>Loại thuộc tính:</strong> {selectedAttribute.type}</p>
            <p><strong>Giá trị:</strong> {selectedAttribute.value}</p>
            <p><strong>Ngày tạo:</strong> {dayjs(selectedAttribute.created_at).format("HH:mm DD/MM/YYYY")}</p>
            <p><strong>Ngày cập nhật:</strong> {dayjs(selectedAttribute.updated_at).format("HH:mm DD/MM/YYYY")}</p>
          </div>
        ) : <p>Không có dữ liệu!</p>}
      </Modal>
    </div>
  );
};

export default AttributeList;
