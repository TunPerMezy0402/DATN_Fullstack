import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Input,
  Descriptions,
  Tooltip,
  Tag,
  Rate,
  Image,
  Select,
} from "antd";
import dayjs from "dayjs";
import {
  SortDescendingOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

interface Product {
  id: number;
  name: string;
  image?: string | null;
  price?: number;
}

interface Order {
  id: number;
  sku: string;
  total_amount?: number;
  payment_status?: string;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  comment_time: string;
  is_approved: boolean;
  user: User;
  product: Product;
  order: Order;
}

const API_URL = "http://127.0.0.1:8000/api";
const BACKEND_URL = "http://127.0.0.1:8000";

const toImageUrl = (imagePath: string) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.startsWith("/")) return `${BACKEND_URL}${imagePath}`;
  return `${BACKEND_URL}/storage/${imagePath}`;
};

const CommentList: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<"comment_time" | "rating">("comment_time");
  const [ascending, setAscending] = useState(false);

  const token = localStorage.getItem("access_token");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/product-reviews?per_page=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const raw = data?.data?.data || data?.data || [];
      setReviews(raw);
    } catch (err: any) {
      console.error(err);
      message.error("Không thể tải danh sách đánh giá!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredSorted = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = reviews.filter((r) => {
      const matchSearch =
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && !r.is_approved) ||
        (statusFilter === "approved" && r.is_approved);

      const matchRating = !ratingFilter || r.rating === parseInt(ratingFilter);

      return matchSearch && matchStatus && matchRating;
    });

    if (sortKey === "comment_time") {
      list = [...list].sort((a, b) =>
        ascending
          ? dayjs(a.comment_time).valueOf() - dayjs(b.comment_time).valueOf()
          : dayjs(b.comment_time).valueOf() - dayjs(a.comment_time).valueOf()
      );
    } else {
      list = [...list].sort((a, b) =>
        ascending ? a.rating - b.rating : b.rating - a.rating
      );
    }
    return list;
  }, [reviews, searchText, statusFilter, ratingFilter, sortKey, ascending]);

  const openDetailModal = (review: Review) => {
    setSelectedReview(review);
    setDetailVisible(true);
  };

  const handleApprove = async (id: number, isApproved: boolean) => {
    try {
      const res = await fetch(`${API_URL}/admin/product-reviews/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: isApproved }),
      });

      if (res.ok) {
        message.success(isApproved ? "✅ Đã duyệt đánh giá!" : "❌ Đã bỏ duyệt đánh giá!");
        fetchReviews();
      } else {
        message.error("Không thể cập nhật đánh giá!");
      }
    } catch (err: any) {
      console.error(err);
      message.error("Không thể cập nhật đánh giá!");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/admin/product-reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        message.success("🗑️ Đã xóa đánh giá!");
        fetchReviews();
      } else {
        message.error("Không thể xóa đánh giá!");
      }
    } catch (err: any) {
      console.error(err);
      message.error("Không thể xóa đánh giá!");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
      align: "center" as const,
      render: (id: number) => `#${id}`,
    },
    {
      title: "Sản phẩm",
      key: "product",
      width: 250,
      render: (_: any, record: Review) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Image
            src={toImageUrl(record.product.image ?? "")}
            alt={record.product.name}
            width={50}
            height={50}
            style={{ objectFit: "cover", borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {record.product.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Người dùng",
      key: "user",
      width: 200,
      render: (_: any, record: Review) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.user.name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{record.user.email}</div>
        </div>
      ),
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
      width: 100,
      align: "center" as const,
      render: (rating: number) => <Rate disabled value={rating} style={{ fontSize: 16 }} />,
    },
    {
      title: "Nội dung",
      dataIndex: "comment",
      key: "comment",
      ellipsis: { showTitle: false },
      render: (comment: string) => (
        <Tooltip title={comment}>
          <span>{comment}</span>
        </Tooltip>
      ),
    },
    {
      title: "Trạng thái",
      key: "is_approved",
      width: 120,
      align: "center" as const,
      render: (_: any, record: Review) =>
        record.is_approved ? (
          <Tag color="success">Đã duyệt</Tag>
        ) : (
          <Tag color="warning">Chờ duyệt</Tag>
        ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      align: "center" as const,
      render: (_: any, record: Review) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => openDetailModal(record)}
            />
          </Tooltip>
          {!record.is_approved ? (
            <Tooltip title="Duyệt">
              <Button
                type="link"
                icon={<CheckOutlined />}
                style={{ color: "#52c41a" }}
                onClick={() => handleApprove(record.id, true)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Bỏ duyệt">
              <Button
                type="link"
                icon={<CloseOutlined />}
                style={{ color: "#fa8c16" }}
                onClick={() => handleApprove(record.id, false)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Xóa đánh giá"
            description="Bạn có chắc muốn xóa đánh giá này?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stats = useMemo(() => {
    return {
      total: reviews.length,
      pending: reviews.filter((r) => !r.is_approved).length,
      approved: reviews.filter((r) => r.is_approved).length,
    };
  }, [reviews]);

  return (
    <div style={{ padding: 24, background: "#f5f7fa", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Quản lý đánh giá</h1>
        <p style={{ color: "#888", marginTop: 4 }}>Danh sách tất cả đánh giá sản phẩm</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ color: "#888", fontSize: 14 }}>Tổng đánh giá</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{stats.total}</div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ color: "#888", fontSize: 14 }}>Chờ duyệt</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#fa8c16" }}>
            {stats.pending}
          </div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ color: "#888", fontSize: 14 }}>Đã duyệt</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: "#52c41a" }}>
            {stats.approved}
          </div>
        </div>
      </div>

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
            placeholder="Tìm theo tên, email, nội dung..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { label: "Tất cả trạng thái", value: "all" },
              { label: "Chờ duyệt", value: "pending" },
              { label: "Đã duyệt", value: "approved" },
            ]}
          />
          <Select
            value={ratingFilter}
            onChange={setRatingFilter}
            style={{ width: 150 }}
            placeholder="Lọc theo sao"
            allowClear
            options={[
              { label: "5 sao", value: "5" },
              { label: "4 sao", value: "4" },
              { label: "3 sao", value: "3" },
              { label: "2 sao", value: "2" },
              { label: "1 sao", value: "1" },
            ]}
          />
          <Tooltip
            title={
              sortKey === "comment_time"
                ? ascending
                  ? "Cũ nhất trước"
                  : "Mới nhất trước"
                : ascending
                  ? "Sao thấp → cao"
                  : "Sao cao → thấp"
            }
          >
            <Button
              size="small"
              shape="circle"
              type={sortKey === "comment_time" ? "primary" : "default"}
              icon={
                sortKey === "comment_time" ? (
                  <SortDescendingOutlined />
                ) : (
                  <SortAscendingOutlined />
                )
              }
              onClick={() => {
                setSortKey("comment_time");
                setAscending((v) => !v);
              }}
            />
          </Tooltip>
          <Tooltip title="Tải lại">
            <Button icon={<ReloadOutlined />} onClick={fetchReviews} />
          </Tooltip>
        </Space>
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
          showTotal: (t) => `Tổng ${t} đánh giá`,
        }}
      />

      <Modal
        title="📄 Chi tiết đánh giá"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={700}
        footer={
          selectedReview && (
            <Space>
              {!selectedReview.is_approved ? (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    handleApprove(selectedReview.id, true);
                    setDetailVisible(false);
                  }}
                >
                  Duyệt đánh giá
                </Button>
              ) : (
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => {
                    handleApprove(selectedReview.id, false);
                    setDetailVisible(false);
                  }}
                >
                  Bỏ duyệt
                </Button>
              )}
              <Popconfirm
                title="Xóa đánh giá"
                description="Bạn có chắc muốn xóa đánh giá này?"
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => {
                  handleDelete(selectedReview.id);
                  setDetailVisible(false);
                }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Xóa đánh giá
                </Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        {selectedReview && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Sản phẩm">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Image
                  src={toImageUrl(selectedReview.product.image ?? "")}
                  alt={selectedReview.product.name}
                  width={50}
                  height={50}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                />

                <div>
                  <div style={{ fontWeight: 500 }}>{selectedReview.product.name}</div>
                  {selectedReview.product.price && (
                    <div style={{ color: "#888", fontSize: 12 }}>
                      Giá: {selectedReview.product.price.toLocaleString("vi-VN")} đ
                    </div>
                  )}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Người đánh giá">
              <div>
                <div style={{ fontWeight: 500 }}>{selectedReview.user.name}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{selectedReview.user.email}</div>
                {selectedReview.user.phone && (
                  <div style={{ color: "#888", fontSize: 12 }}>{selectedReview.user.phone}</div>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Đánh giá">
              <Rate disabled value={selectedReview.rating} />
              <span style={{ marginLeft: 8 }}>({selectedReview.rating}/5)</span>
            </Descriptions.Item>
            <Descriptions.Item label="Nội dung">
              <div style={{ whiteSpace: "pre-wrap" }}>{selectedReview.comment}</div>
            </Descriptions.Item>
            <Descriptions.Item label="Mã đơn hàng">{selectedReview.order.sku}</Descriptions.Item>
            {selectedReview.order.total_amount && (
              <Descriptions.Item label="Tổng tiền">
                {selectedReview.order.total_amount.toLocaleString("vi-VN")} đ
              </Descriptions.Item>
            )}
            {selectedReview.order.payment_status && (
              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag color={selectedReview.order.payment_status === "paid" ? "success" : "warning"}>
                  {selectedReview.order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                </Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Trạng thái">
              {selectedReview.is_approved ? (
                <Tag color="success">Đã duyệt</Tag>
              ) : (
                <Tag color="warning">Chờ duyệt</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default CommentList;