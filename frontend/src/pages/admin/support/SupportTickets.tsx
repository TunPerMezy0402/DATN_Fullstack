import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Table,
  Tag,
  Select,
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
  Spin,
} from "antd";
import {
  EyeOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  InboxOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import axiosClient from "../../../api/axiosClient";

const { Title, Text, Paragraph } = Typography;

interface User {
  id: number;
  name: string;
  email: string;
}

interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  updated_at: string;
  user?: User;
}

interface PaginationResponse {
  data: SupportTicket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const SupportTickets: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("status") || "all"
  );

  // Fetch tickets when tab changes
  useEffect(() => {
    console.log('🔄 Tab changed to:', activeTab);
    fetchTickets(1);
  }, [activeTab]);

  const fetchTickets = async (page: number = 1) => {
    try {
      setLoading(true);
      const params: any = { page, per_page: 20 };

      if (activeTab !== "all") {
        params.status = activeTab;
      }

      console.log('📡 Fetching with params:', params);
      
      const response = await axiosClient.get("/admin/support-tickets", {
        params,
      });

      console.log('✅ Response received:', response);

      // axiosClient returns response.data automatically
      // So response is already the pagination object: { data, current_page, per_page, total, ... }
      const data = response as unknown as PaginationResponse;

      console.log('📊 Data:', {
        tickets: data.data?.length || 0,
        current_page: data.current_page,
        total: data.total,
      });

      setTickets(Array.isArray(data.data) ? data.data : []);
      setPagination({
        current: data.current_page || 1,
        pageSize: data.per_page || 20,
        total: data.total || 0,
      });
    } catch (error: any) {
      console.error("❌ Error fetching tickets:", error);
      messageApi.error(
        error?.response?.data?.message || "Có lỗi khi tải danh sách ticket"
      );
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      setUpdatingStatus(ticketId);
      
      await axiosClient.patch(`/admin/support-tickets/${ticketId}/status`, {
        status: newStatus,
      });

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: newStatus as any } : t
        )
      );
      
      messageApi.success("Cập nhật trạng thái thành công");
    } catch (error: any) {
      console.error("Error updating status:", error);
      messageApi.error(
        error?.response?.data?.message || "Có lỗi khi cập nhật trạng thái"
      );
      // Reload tickets to sync with server
      await fetchTickets(pagination.current || 1);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = (ticketId: number) => {
    Modal.confirm({
      title: "Xóa ticket",
      content: "Bạn có chắc chắn muốn xóa ticket này? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        setDeleting(ticketId);
        try {
          await axiosClient.delete(`/admin/support-tickets/${ticketId}`);
          setTickets((prev) => prev.filter((t) => t.id !== ticketId));
          messageApi.success("Xóa ticket thành công");
        } catch (error: any) {
          console.error("Error deleting ticket:", error);
          messageApi.error(
            error?.response?.data?.message || "Có lỗi khi xóa ticket"
          );
        } finally {
          setDeleting(null);
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

  const handlePaginationChange = (page: number) => {
    fetchTickets(page);
  };

  const handleRefresh = () => {
    fetchTickets(pagination.current || 1);
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const columns: ColumnsType<SupportTicket> = [
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
          <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: "#1890ff" }} />
          <div>
            <div style={{ marginBottom: "4px" }}>
              <Text strong>{record.user?.name || "N/A"}</Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.user?.email || "N/A"}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Tiêu đề & Nội dung",
      key: "content",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block", marginBottom: "4px" }}>
            {record.subject}
          </Text>
          <Paragraph
            ellipsis={{ rows: 2 }}
            type="secondary"
            style={{ margin: 0, fontSize: "13px", maxWidth: "500px" }}
          >
            {record.message}
          </Paragraph>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_, record) => (
        <Spin spinning={updatingStatus === record.id} size="small">
          <Select
            value={record.status}
            onChange={(value) => handleStatusChange(record.id, value)}
            style={{ width: "100%" }}
            disabled={updatingStatus === record.id}
            options={[
              { value: "open", label: "Mới" },
              { value: "in_progress", label: "Đang xử lý" },
              { value: "closed", label: "Đã đóng" },
            ]}
          />
        </Spin>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      width: 160,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {formatDateTime(date)}
        </Text>
      ),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 160,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {formatDateTime(date)}
        </Text>
      ),
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 100,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <Space size="small">
          <Link to={`/admin/support-tickets/${record.id}`}>
            <Tooltip title="Xem chi tiết">
              <Button
                type="primary"
                icon={<EyeOutlined />}
                size="small"
              />
            </Tooltip>
          </Link>
          <Tooltip title="Xóa">
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              loading={deleting === record.id}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: "Tất cả",
    },
    {
      key: "open",
      label: (
        <span>
          Mới <Tag color="success">Open</Tag>
        </span>
      ),
    },
    {
      key: "in_progress",
      label: (
        <span>
          Đang xử lý <Tag color="warning">In Progress</Tag>
        </span>
      ),
    },
    {
      key: "closed",
      label: (
        <span>
          Đã đóng <Tag color="default">Closed</Tag>
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {contextHolder}

      {/* Header Card */}
      <Card style={{ marginBottom: "24px" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={2} style={{ margin: 0 }}>
                <CustomerServiceOutlined style={{ marginRight: "12px" }} />
                Hỗ Trợ Khách Hàng
              </Title>
              <Text type="secondary">
                Quản lý tất cả yêu cầu hỗ trợ từ khách hàng
              </Text>
            </Space>
          </Col>
          <Col>
            <Statistic
              title="Tổng số ticket"
              value={pagination.total || 0}
              prefix={<InboxOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content Card */}
      <Card
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Làm mới
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          style={{ marginBottom: "16px" }}
        />

        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePaginationChange,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} tickets`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có ticket nào"
              />
            ),
          }}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default SupportTickets;