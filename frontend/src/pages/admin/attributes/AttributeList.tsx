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

const AttributeList: React.FC = () => {
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        message.error("Không tìm thấy token trong localStorage!");
        setLoading(false);
        return;
      }

      const res = await axios.get(
        "http://127.0.0.1:8000/api/admin/attributes",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data =
        res?.data?.data?.data || res?.data?.data || [];
      setAttributes(data);
    } catch (error: any) {
      console.error("❌ Lỗi khi gọi API:", error);
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
      item?.type?.toLowerCase().includes(searchText.toLowerCase()) ||
      item?.value?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 70,
      align: "center" as const,
    },
    {
      title: "Loại thuộc tính",
      dataIndex: "type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
      align: "center" as const,
    },
    {
      title: "Giá trị",
      dataIndex: "value",
      align: "center" as const,
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      render: (date: string) => dayjs(date).format("HH:mm DD/MM/YYYY"),
      align: "center" as const,
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updated_at",
      render: (date: string) => dayjs(date).format("HH:mm DD/MM/YYYY"),
      align: "center" as const,
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Card variant="borderless" className="shadow-md rounded-2xl bg-white">
        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between mb-6"
          style={{ gap: "20px" }}
        >
          {/* Trái */}
          <div className="flex items-center gap-4">
            <Title level={4} style={{ margin: 0 }}>
              🧩 Danh sách thuộc tính
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/admin/attributes/create")}
            >
              Thêm thuộc tính
            </Button>
          </div>

          {/* Phải */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Tìm theo loại hoặc giá trị..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 260 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAttributes}
              type="default"
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Bảng */}
        <Spin spinning={loading} tip="Đang tải dữ liệu...">
          <Table
            bordered
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showTotal: (total) => `Tổng ${total} thuộc tính`,
            }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AttributeList;
