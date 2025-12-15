import React, { useEffect, useState } from "react";
import { Table, Tag, Card, Space, Typography, Button, Spin, message, Modal, Descriptions } from "antd";
import { EyeOutlined, ReloadOutlined, DollarOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const API_URL = "http://127.0.0.1:8000/api";
const getToken = () => localStorage.getItem("access_token") || localStorage.getItem("token");

const formatMoney = (val: any) => {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toLocaleString("vi-VN");
};

interface Transaction {
  id: number;
  order_id: number;
  transaction_code: string;
  amount: number;
  status: string;
  payment_method: string;
  bank_code?: string;
  response_code?: string;
  paid_at?: string;
  created_at: string;
  transaction_info?: any;
}

const TransactionListAdmin: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/payment-transactions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      setTransactions(json.data || []);
    } catch (err) {
      message.error("Không thể tải danh sách giao dịch");
    } finally {
      setLoading(false);
    }
  };

  const showDetail = (record: Transaction) => {
    setSelectedTransaction(record);
    setDetailModal(true);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Mã đơn hàng",
      dataIndex: "order_id",
      key: "order_id",
      render: (id: number) => (
        <Text strong style={{ color: "#1890ff" }}>
          #{id}
        </Text>
      ),
    },
    {
      title: "Mã giao dịch",
      dataIndex: "transaction_code",
      key: "transaction_code",
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      align: "right" as const,
      render: (amount: number) => (
        <Text strong style={{ color: "#ff4d4f" }}>
          {formatMoney(amount)}₫
        </Text>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "payment_method",
      key: "payment_method",
      render: (method: string) => (
        <Tag color={method === "vnpay" ? "blue" : "green"}>
          {method === "vnpay" ? "VNPay" : "COD"}
        </Tag>
      ),
    },
    {
      title: "Ngân hàng",
      dataIndex: "bank_code",
      key: "bank_code",
      render: (code?: string) => code || "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const config = {
          success: { color: "success", text: "Thành công" },
          pending: { color: "processing", text: "Đang xử lý" },
          failed: { color: "error", text: "Thất bại" },
        }[status] || { color: "default", text: status };

        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleString("vi-VN"),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: Transaction) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f5f5f5", minHeight: "100vh" }}>
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <DollarOutlined /> Danh sách giao dịch
          </Title>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchTransactions}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `Tổng ${total} giao dịch`,
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>Chi tiết giao dịch #{selectedTransaction?.id}</span>
          </Space>
        }
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedTransaction && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">{selectedTransaction.id}</Descriptions.Item>
            <Descriptions.Item label="Mã đơn hàng">
              <Text strong>#{selectedTransaction.order_id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã giao dịch">
              <Text code>{selectedTransaction.transaction_code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Số tiền">
              <Text strong style={{ fontSize: 16, color: "#ff4d4f" }}>
                {formatMoney(selectedTransaction.amount)}₫
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức">
              <Tag color={selectedTransaction.payment_method === "vnpay" ? "blue" : "green"}>
                {selectedTransaction.payment_method === "vnpay" ? "VNPay" : "COD"}
              </Tag>
            </Descriptions.Item>
            {selectedTransaction.bank_code && (
              <Descriptions.Item label="Ngân hàng">
                {selectedTransaction.bank_code}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Trạng thái">
              <Tag
                color={
                  selectedTransaction.status === "success"
                    ? "success"
                    : selectedTransaction.status === "pending"
                    ? "processing"
                    : "error"
                }
              >
                {selectedTransaction.status === "success"
                  ? "Thành công"
                  : selectedTransaction.status === "pending"
                  ? "Đang xử lý"
                  : "Thất bại"}
              </Tag>
            </Descriptions.Item>
            {selectedTransaction.response_code && (
              <Descriptions.Item label="Mã phản hồi">
                {selectedTransaction.response_code}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Thời gian tạo">
              {new Date(selectedTransaction.created_at).toLocaleString("vi-VN")}
            </Descriptions.Item>
            {selectedTransaction.paid_at && (
              <Descriptions.Item label="Thời gian thanh toán">
                {new Date(selectedTransaction.paid_at).toLocaleString("vi-VN")}
              </Descriptions.Item>
            )}
            {selectedTransaction.transaction_info && (
              <Descriptions.Item label="Thông tin bổ sung">
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 300,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(selectedTransaction.transaction_info, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default TransactionListAdmin;