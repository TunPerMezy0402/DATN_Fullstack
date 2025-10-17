import React, { useEffect, useState } from "react";
import { Table, Tag, message, Input, Card, Typography, Spin, Button, Space, Modal } from "antd";
import { SearchOutlined, ReloadOutlined, RollbackOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
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
  deleted_at?: string;
}

const AttributeTrashList: React.FC = () => {
  const [items, setItems] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const API_URL = "http://127.0.0.1:8000/api";
  const token = localStorage.getItem("access_token");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTrash = async () => {
    setLoading(true);
    try {
      // ✅ ĐỔI endpoint này cho khớp backend của bạn (ví dụ: /admin/attributes?trashed=1)
      const res = await axios.get(`${API_URL}/admin/attributes/trash`, { headers });
      const data = res?.data?.data?.data || res?.data?.data || [];
      setItems(data);
    } catch (e) {
      console.error(e);
      message.error("Không thể tải danh sách đã xóa!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const filtered = items.filter(
    (i) =>
      i.type.toLowerCase().includes(searchText.toLowerCase()) ||
      i.value.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${API_URL}/admin/attributes/${id}/restore`, null, { headers });
      message.success("✅ Khôi phục thành công!");
      fetchTrash();
    } catch (e) {
      console.error(e);
      message.error("Không thể khôi phục!");
    }
  };

  const handleForceDelete = async (id: number) => {
    Modal.confirm({
      title: "Xóa vĩnh viễn?",
      content: "Hành động này không thể hoàn tác.",
      okText: "Xóa vĩnh viễn",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await axios.delete(`${API_URL}/admin/attributes/${id}/force-delete`, { headers });
          message.success("🗑️ Đã xóa vĩnh viễn!");
          fetchTrash();
        } catch (e) {
          console.error(e);
          message.error("Không thể xóa vĩnh viễn!");
        }
      },
    });
  };

  const columns = [
    { title: "ID", dataIndex: "id", width: 70, align: "center" as const },
    {
      title: "Loại thuộc tính",
      dataIndex: "type",
      align: "center" as const,
      render: (type: string) => <Tag color="orange">{type}</Tag>,
    },
    { title: "Giá trị", dataIndex: "value", align: "center" as const },
    {
      title: "Đã xóa lúc",
      dataIndex: "deleted_at",
      align: "center" as const,
      render: (d: string) => (d ? dayjs(d).format("HH:mm DD/MM/YYYY") : "-"),
    },
    {
      title: "Hành động",
      align: "center" as const,
      render: (_: any, record: Attribute) => (
        <Space>
          <Button icon={<RollbackOutlined />} onClick={() => handleRestore(record.id)}>
            Khôi phục
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleForceDelete(record.id)}>
            Xóa vĩnh viễn
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card className="shadow-md rounded-2xl bg-white">
        <div className="flex flex-wrap items-center justify-between mb-6" style={{ gap: 20 }}>
          <div className="flex items-center gap-8">
            <Space size="middle">
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/attributes")}>
                Quay lại danh sách
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                🗂️ Thùng rác thuộc tính (đã xóa mềm)
              </Title>
            </Space>
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
            <Button icon={<ReloadOutlined />} onClick={fetchTrash}>
              Làm mới
            </Button>
          </div>
        </div>

        <Spin spinning={loading} tip="Đang tải dữ liệu...">
          <Table
            bordered
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 5, showTotal: (t) => `Tổng ${t} thuộc tính đã xóa` }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AttributeTrashList;
