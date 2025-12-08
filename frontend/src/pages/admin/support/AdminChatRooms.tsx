import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Table,
  Tag,
  Space,
  Button,
  Card,
  Statistic,
  Row,
  Col,
  Avatar,
  Tooltip,
  Typography,
  message,
  Empty,
  Tabs,
  Modal,
  Input,
  Badge,
} from "antd";
import {
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  CloseOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import axiosClient from "../../../api/axiosClient";

const { Title, Text } = Typography;
const { Search } = Input;

interface User {
  id: number;
  name: string;
  email: string;
  image: string | null;
}

interface Agent {
  id: number;
  name: string;
  image: string | null;
  rating: number;
  status: string;
}

interface LastMessage {
  content: string;
  has_attachment: boolean;
  sender_type: "user" | "agent";
  created_at: string;
}

interface ChatRoom {
  id: number;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  unread_count: number;
  user: User;
  agent: Agent | null;
  last_message: LastMessage | null;
}

interface DashboardStats {
  total_rooms: number;
  open_rooms: number;
  closed_rooms: number;
  total_messages: number;
  unread_messages: number;
  total_agents: number;
  online_agents: number;
  busy_agents: number;
}

const AdminChatRooms: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("status") || "all"
  );

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_rooms: 0,
    open_rooms: 0,
    closed_rooms: 0,
    total_messages: 0,
    unread_messages: 0,
    total_agents: 0,
    online_agents: 0,
    busy_agents: 0,
  });

  useEffect(() => {
    fetchDashboard();
    fetchChatRooms();
  }, [activeTab, searchKeyword]);

  // ✅ GET /admin/chat/dashboard
  const fetchDashboard = async () => {
    try {
      const response = await axiosClient.get("/admin/chat/dashboard");
      if (response.success) {
        setDashboardStats(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard:", error);
    }
  };

  // ✅ GET /admin/chat?status=...&search=...
  const fetchChatRooms = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (activeTab !== "all") {
        params.status = activeTab;
      }

      if (searchKeyword) {
        params.search = searchKeyword;
      }

      const response = await axiosClient.get("/admin/chat", { params });

      if (response.success) {
        setChatRooms(response.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching chat rooms:", error);
      messageApi.error(
        error?.response?.data?.message || "Có lỗi khi tải danh sách phòng chat"
      );
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ POST /admin/chat/{id}/close
  const handleCloseRoom = (roomId: number) => {
    Modal.confirm({
      title: "Đóng phòng chat",
      content: "Bạn có chắc chắn muốn đóng phòng chat này?",
      okText: "Đóng",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const response = await axiosClient.post(`/admin/chat/${roomId}/close`);
          if (response.success) {
            messageApi.success(response.message || "Đã đóng phòng chat");
            fetchChatRooms();
            fetchDashboard();
          }
        } catch (error: any) {
          console.error("Error closing room:", error);
          messageApi.error(
            error?.response?.data?.message || "Có lỗi khi đóng phòng chat"
          );
        }
      },
    });
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ status: key });
    }
  };

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  const columns: ColumnsType<ChatRoom> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 70,
      render: (id: number) => <Text strong>#{id}</Text>,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "Khách hàng",
      key: "user",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Avatar 
            src={record.user.image} 
            icon={<UserOutlined />} 
            size="small"
          />
          <div>
            <div>
              <Text strong>{record.user.name}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.user.email}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Tiêu đề",
      dataIndex: "subject",
      key: "subject",
      render: (subject: string, record) => (
        <div>
          <Text strong>{subject}</Text>
          {record.last_message && (
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.last_message.has_attachment && "📎 "}
                {record.last_message.content || "Đã gửi file đính kèm"}
              </Text>
              <div>
                <Text type="secondary" style={{ fontSize: "11px" }}>
                  {record.last_message.created_at}
                </Text>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Agent",
      key: "agent",
      width: 180,
      render: (_, record) => (
        record.agent ? (
          <Space size="small">
            <Avatar 
              src={record.agent.image} 
              icon={<TeamOutlined />} 
              size="small"
            />
            <div>
              <Text>{record.agent.name}</Text>
              <div>
                <Tag 
                  color={
                    record.agent.status === 'online' ? 'green' : 
                    record.agent.status === 'busy' ? 'orange' : 
                    'default'
                  } 
                  style={{ fontSize: "10px" }}
                >
                  {record.agent.status}
                </Tag>
                <Tag color="blue" style={{ fontSize: "10px" }}>
                  ⭐ {record.agent.rating.toFixed(1)}
                </Tag>
              </div>
            </div>
          </Space>
        ) : (
          <Text type="secondary">Chưa gán</Text>
        )
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={record.status === "open" ? "green" : "default"}>
            {record.status === "open" ? "Đang mở" : "Đã đóng"}
          </Tag>
          {record.unread_count > 0 && (
            <Badge 
              count={record.unread_count} 
              style={{ fontSize: "10px" }}
              overflowCount={99}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {date}
        </Text>
      ),
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 130,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {date}
        </Text>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 120,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Link to={`/admin/chat/${record.id}`}>
            <Tooltip title="Xem & Trả lời">
              <Button
                type="primary"
                icon={<MessageOutlined />}
                size="small"
              />
            </Tooltip>
          </Link>
          
          {record.status === "open" && (
            <Tooltip title="Đóng phòng">
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={() => handleCloseRoom(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: `Tất cả (${dashboardStats.total_rooms})`,
    },
    {
      key: "open",
      label: (
        <span>
          Đang mở <Tag color="success">{dashboardStats.open_rooms}</Tag>
        </span>
      ),
    },
    {
      key: "closed",
      label: (
        <span>
          Đã đóng <Tag color="default">{dashboardStats.closed_rooms}</Tag>
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {contextHolder}

      {/* Header Card với Dashboard Stats */}
      <Card style={{ marginBottom: "24px" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>
                <MessageOutlined style={{ marginRight: "12px" }} />
                Quản Lý Chat Hỗ Trợ
              </Title>
              <Text type="secondary">
                Quản lý và trả lời các yêu cầu hỗ trợ từ khách hàng
              </Text>
            </Space>
          </Col>
          <Col>
            <Row gutter={16}>
              <Col>
                <Statistic
                  title="Tổng phòng chat"
                  value={dashboardStats.total_rooms}
                  prefix={<MessageOutlined />}
                />
              </Col>
              <Col>
                <Statistic
                  title="Đang mở"
                  value={dashboardStats.open_rooms}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Col>
              <Col>
                <Statistic
                  title="Tin chưa đọc"
                  value={dashboardStats.unread_messages}
                  valueStyle={{ color: "#cf1322" }}
                  prefix={<Badge status="processing" />}
                />
              </Col>
              <Col>
                <Statistic
                  title="Agents Online"
                  value={dashboardStats.online_agents}
                  suffix={`/ ${dashboardStats.total_agents}`}
                  valueStyle={{ color: "#1890ff" }}
                  prefix={<TeamOutlined />}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Main Content Card */}
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {/* Search & Actions */}
          <Row justify="space-between" align="middle">
            <Col span={12}>
              <Search
                placeholder="Tìm theo tiêu đề, tên khách hàng, email..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ maxWidth: 500 }}
              />
            </Col>
            <Col>
              <Space>
                <Link to="/admin/chat/agents">
                  <Button icon={<TeamOutlined />} size="large">
                    Quản lý Agents
                  </Button>
                </Link>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    fetchChatRooms();
                    fetchDashboard();
                  }}
                  loading={loading}
                  size="large"
                >
                  Làm mới
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Tabs Filter */}
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={tabItems}
          />

          {/* Table */}
          <Table
            columns={columns}
            dataSource={chatRooms}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} phòng chat`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không có phòng chat nào"
                />
              ),
            }}
            scroll={{ x: 1400 }}
            size="middle"
          />
        </Space>
      </Card>
    </div>
  );
};

export default AdminChatRooms;