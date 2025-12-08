import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Descriptions,
  Typography,
  message,
  Spin,
  Button,
  Row,
  Col,
  Space,
  Tag,
  Divider,
  Steps,
  Modal,
  Input,
  Rate,
  Checkbox,
  InputNumber,
  Image as AntImage,
} from "antd";
import {
  ArrowLeftOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  HomeOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  StarOutlined,
  UserOutlined,
  RollbackOutlined,
  StopOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import axios from "axios";

const { Text, Title } = Typography;
const { TextArea } = Input;

// ==================== INTERFACES ====================
interface Review {
  id: number;
  user_id: number;
  product_id: number;
  variant_id: number;
  order_id: number;
  rating: number;
  comment: string;
  comment_time: string;
  parent_id: number | null;
}

interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  product_image?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: string;
  total: number;
  reviews?: Review[];
  returned_quantity?: number;
  available_return_quantity?: number;
}

interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface Shipping {
  id: number;
  sku: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_status: string;
  reason?: string;
  reason_admin?: string;
  transfer_image?: string | null;
  city: string;
  district: string;
  commune: string;
  village: string;
  notes?: string | null;
  shipping_fee?: string;
  received_at?: string | null;
}

interface ShippingLog {
  id: number;
  old_status: string | null;
  new_status: string;
  created_at: string;
}

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  discount_amount: string;
  payment_status: string;
  payment_method: string;
  note?: string;
  created_at: string;
  user: User;
  items: OrderItem[];
  shipping: Shipping;
  shipping_logs?: ShippingLog[];
}

interface ReviewFormItem {
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  rating: number;
  comment: string;
  selected: boolean;
}

interface ReturnItem {
  order_item_id: number;
  variant_id: number;
  product_name: string;
  quantity: number;
  max_quantity: number;
  reason: string;
  selected: boolean;
}

interface ReturnRequestItem {
  id: number;
  order_item_id: number;
  variant_id: number;
  quantity: number;
  status: string;
  reason: string;
  refund_amount: string;
  admin_response?: string;
}

interface ReturnRequest {
  id: number;
  order_id: number;
  status: string;
  total_return_amount: string;
  refunded_discount: string;
  old_shipping_fee: string;
  new_shipping_fee: string;
  shipping_diff: string;
  estimated_refund: string;
  remaining_amount: string;
  requested_at: string;
  items: ReturnRequestItem[];
}

// ==================== CONSTANTS ====================
const API_URL = "http://127.0.0.1:8000/api";

const STATUS_MAPS = {
  payment: {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    failed: "Thanh toán thất bại",
    refund_processing: "Đang hoàn tiền",
  },
  shipping: {
    pending: "Chờ xử lý",
    nodone: "Chưa thanh toán",
    in_transit: "Đang vận chuyển",
    delivered: "Đã giao hàng",
    received: "Đã nhận hàng",
    failed: "Giao thất bại",
    return_processing: "Đang xử lý hoàn hàng",
    return_fail: "Hoàn thất bại",
    returned: "Đã hoàn hàng",
    cancelled: "Đã hủy",
    none: "Đã hủy",
  },
  paymentMethod: {
    cod: "Thanh toán khi nhận hàng",
    vnpay: "VNPAY",
  },
  returnStatus: {
    pending: "Chờ xử lý",
    approved: "Đã chấp nhận",
    completed: "Hoàn thành",
    rejected: "Đã từ chối",
  },
  returnItemStatus: {
    pending: "Chờ xử lý",
    approved: "Đã duyệt",
    completed: "Hoàn thành",
    rejected: "Đã từ chối",
  },
};

const STATUS_COLORS = {
  payment: {
    unpaid: "orange",
    paid: "green",
    refunded: "blue",
    failed: "red",
    refund_processing: "purple",
  },
  shipping: {
    pending: "orange",
    nodone: "gold",
    in_transit: "blue",
    delivered: "green",
    received: "cyan",
    failed: "red",
    return_fail: "red",
    return_processing: "orange",
    returned: "purple",
    cancelled: "default",
    none: "default",
  },
  paymentMethod: {
    cod: "orange",
    vnpay: "green",
  },
  returnStatus: {
    pending: "gold",
    approved: "blue",
    completed: "green",
    rejected: "red",
  },
  returnItemStatus: {
    pending: "gold",
    approved: "blue",
    completed: "green",
    rejected: "red",
  },
};

// ==================== HELPER FUNCTIONS ====================
const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number | string) => {
  return Math.round(parseFloat(String(amount))).toLocaleString("vi-VN") + "₫";
};
const getDaysUntilReturnExpired = (receivedAt: string | null): number => {
  if (!receivedAt) return 0;
  const received = new Date(receivedAt);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 7 - daysPassed);
};

// Thêm vào phần helper functions, sau hàm getDaysUntilReturnExpired
const calculateRefundAmount = (returnRequest: ReturnRequest) => {
  // Chỉ tính tiền hoàn cho các item đã được duyệt (approved hoặc completed)
  const approvedItems = returnRequest.items.filter(
    item => item.status === "approved" || item.status === "completed"
  );

  const totalApprovedAmount = approvedItems.reduce(
    (sum, item) => sum + parseFloat(item.refund_amount || "0"),
    0
  );

  // Tính tỷ lệ giảm giá được hoàn dựa trên số tiền đã duyệt
  const totalReturnAmount = parseFloat(returnRequest.total_return_amount || "0");
  const refundedDiscount = totalReturnAmount > 0
    ? (totalApprovedAmount / totalReturnAmount) * parseFloat(returnRequest.refunded_discount || "0")
    : 0;

  // Tính chênh lệch phí ship
  const shippingDiff = parseFloat(returnRequest.shipping_diff || "0");

  // Số tiền hoàn thực tế = Tiền hàng đã duyệt - Giảm giá được hoàn - Chênh lệch phí ship
  const estimatedRefund = totalApprovedAmount - refundedDiscount - shippingDiff;

  return {
    totalApprovedAmount,
    refundedDiscount,
    estimatedRefund,
    approvedItemsCount: approvedItems.length,
    totalItemsCount: returnRequest.items?.length || 0,
    shippingDiff
  };
};

// ==================== MAIN COMPONENT ====================
const OrderUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State Management
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  // Return Modal State
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returning, setReturning] = useState(false);

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [viewReviewsModalVisible, setViewReviewsModalVisible] = useState(false);
  const [reviewForms, setReviewForms] = useState<ReviewFormItem[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Other State
  const [confirmReceivedLoading, setConfirmReceivedLoading] = useState(false);

  // ==================== HELPER FUNCTIONS FOR RETURN ====================
  const getItemReturnStatus = (orderItemId: number): { status: string; returnedQty: number } | null => {
    for (const request of returnRequests) {
      const returnItem = request.items.find(item => item.order_item_id === orderItemId);
      if (returnItem) {
        return {
          status: returnItem.status,
          returnedQty: returnItem.quantity
        };
      }
    }
    return null;
  };

  const getFullImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://127.0.0.1:8000/${imagePath.replace(/^\//, "")}`;
  };

  const getReturnStatusText = (status: string): string => {
    return STATUS_MAPS.returnStatus[status as keyof typeof STATUS_MAPS.returnStatus] || status;
  };

  const getReturnStatusColor = (status: string): string => {
    return STATUS_COLORS.returnStatus[status as keyof typeof STATUS_COLORS.returnStatus] || 'default';
  };

  const getReturnItemStatusText = (status: string): string => {
    return STATUS_MAPS.returnItemStatus[status as keyof typeof STATUS_MAPS.returnItemStatus] || status;
  };

  const getReturnItemStatusColor = (status: string): string => {
    return STATUS_COLORS.returnItemStatus[status as keyof typeof STATUS_COLORS.returnItemStatus] || 'default';
  };

  // ==================== DATA FETCHING ====================
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const [orderRes, logsRes, returnRequestsRes] = await Promise.all([
        axios.get(`${API_URL}/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/orders/${id}/shipping-logs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/orders/${id}/return-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { data: [] } })),
      ]);

      setOrder({
        ...orderRes.data.data,
        shipping_logs: logsRes.data.data || [],
      });

      setReturnRequests(returnRequestsRes.data.data || []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải chi tiết đơn hàng!");
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // ==================== PERMISSION CHECKS ====================
  const canConfirmReceived = (status: string) => status === "delivered";

  const canReturnOrder = (shipping: Shipping | undefined): boolean => {
    if (!shipping) return false;
    if (shipping.shipping_status !== "received") return false;
    if (!shipping.received_at) return false;

    const daysLeft = getDaysUntilReturnExpired(shipping.received_at);
    return daysLeft > 0;
  };

  const canReview = (status: string) => {
    return ["received", "return_processing"].includes(status);
  };

  const hasUnreviewedVariants = (order?.items || []).some(item => {
    const hasNoReview = !item.reviews || item.reviews.length === 0;
    // Kiểm tra xem còn sản phẩm chưa bị hoàn hết không
    const remainingQty = item.quantity - (item.returned_quantity || 0);
    return hasNoReview && remainingQty > 0;
  });

  const hasReviewedVariants = (order?.items || []).some(
    item => item.reviews && item.reviews.length > 0
  );

  // ==================== EVENT HANDLERS ====================

  const handleConfirmReceived = async () => {
    try {
      setConfirmReceivedLoading(true);
      const token = getAuthToken();

      await axios.post(
        `${API_URL}/orders/${id}/confirm-received`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Đã xác nhận nhận hàng thành công!");
      await fetchOrder();
    } catch (error: any) {
      console.error(error);
      message.error(error.response?.data?.message || "Không thể xác nhận nhận hàng!");
    } finally {
      setConfirmReceivedLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy đơn hàng!");
      return;
    }

    try {
      setCancelling(true);
      const token = getAuthToken();

      await axios.post(
        `${API_URL}/orders/${id}/cancel`,
        { reason: cancelReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCancelModalVisible(false);
      setCancelReason("");

      // ✅ Delay 2.5 giây rồi mới hiển thị thông báo và load lại
      await new Promise(resolve => setTimeout(resolve, 2500));

      message.success("Hủy đơn hàng thành công!");
      await fetchOrder();
    } catch (error: any) {
      console.error("Cancel error:", error);
      const errorMsg = error.response?.data?.message || "Không thể hủy đơn hàng!";

      // ✅ Hiển thị thông báo lỗi ngay
      message.error(errorMsg);

      // ✅ Delay 2.5 giây rồi mới load lại trang
      await new Promise(resolve => setTimeout(resolve, 2500));

      // ✅ Đóng modal và clear dữ liệu TRƯỚC khi fetch
      setCancelModalVisible(false);
      setCancelReason("");

      await fetchOrder();
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReturnModal = () => {
    if (!order) return;

    const returnableItems: ReturnItem[] = (order.items || [])
      .filter(item => {
        const hasNoReview = !item.reviews || item.reviews.length === 0;
        const availableQty = item.available_return_quantity ?? 0;
        return hasNoReview && availableQty > 0;
      })
      .map(item => {
        const availableQty = item.available_return_quantity ?? 0;
        return {
          order_item_id: item.id,
          variant_id: item.variant_id,
          product_name: `${item.product_name}${item.size ? ` - Size: ${item.size}` : ""}${item.color ? ` - Màu: ${item.color}` : ""}`,
          quantity: availableQty,
          max_quantity: availableQty,
          reason: "",
          selected: false,
        };
      });

    if (returnableItems.length === 0) {
      message.warning("Không có sản phẩm nào có thể hoàn trả!");
      return;
    }

    setReturnItems(returnableItems);
    setReturnModalVisible(true);
  };

  const handleReturnOrder = async () => {
    const selectedItems = returnItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      message.warning("Vui lòng chọn ít nhất một sản phẩm để hoàn!");
      return;
    }

    const hasEmptyReason = selectedItems.some(item => !item.reason.trim());
    if (hasEmptyReason) {
      message.warning("Vui lòng nhập lý do hoàn cho tất cả sản phẩm đã chọn!");
      return;
    }

    const hasInvalidQuantity = selectedItems.some(
      item => item.quantity <= 0 || item.quantity > item.max_quantity
    );
    if (hasInvalidQuantity) {
      message.warning("Số lượng hoàn không hợp lệ!");
      return;
    }

    try {
      setReturning(true);
      const token = getAuthToken();

      const items = selectedItems.map(item => ({
        order_item_id: Number(item.order_item_id),
        variant_id: Number(item.variant_id),
        quantity: Number(item.quantity),
        reason: String(item.reason.trim()),
      }));

      await axios.post(
        `${API_URL}/orders/${id}/return`,
        { items },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Yêu cầu hoàn hàng đã được gửi thành công!");
      setReturnModalVisible(false);
      setReturnItems([]);
      await fetchOrder();
    } catch (error: any) {
      console.error("Return error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Không thể tạo yêu cầu hoàn hàng!";
      message.error(errorMsg);
    } finally {
      setReturning(false);
    }
  };

  const handleOpenReviewModal = () => {
    if (!order) return;

    const unreviewedItems = (order.items || []).filter(item => {
      const hasNoReview = !item.reviews || item.reviews.length === 0;
      const remainingQty = item.quantity - (item.returned_quantity || 0);
      // Chỉ lấy sản phẩm chưa đánh giá VÀ còn số lượng chưa bị hoàn hết
      return hasNoReview && remainingQty > 0;
    });

    if (unreviewedItems.length === 0) {
      message.info("Tất cả sản phẩm trong đơn hàng đã được đánh giá!");
      return;
    }

    const forms: ReviewFormItem[] = unreviewedItems.map(item => ({
      order_item_id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: `${item.product_name}${item.size ? ` - Size: ${item.size}` : ""}${item.color ? ` - Màu: ${item.color}` : ""}`,
      rating: 5,
      comment: "",
      selected: false,
    }));

    setReviewForms(forms);
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async () => {
    const selectedForms = reviewForms.filter(form => form.selected);

    if (selectedForms.length === 0) {
      message.warning("Vui lòng chọn ít nhất một sản phẩm để đánh giá!");
      return;
    }

    const hasInvalidComment = selectedForms.some(
      form => form.comment.trim().length < 1
    );

    if (hasInvalidComment) {
      message.warning("Nội dung đánh giá phải có ít nhất 1 ký tự!");
      return;
    }

    try {
      setSubmittingReview(true);
      const token = getAuthToken();

      const reviewPromises = selectedForms.map(form => {
        const payload = {
          product_id: Number(form.product_id),
          variant_id: Number(form.variant_id),
          order_id: Number(order?.id),
          rating: Number(form.rating),
          comment: String(form.comment.trim()),
        };

        return axios.post(
          `${API_URL}/product-reviews`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });

      await Promise.all(reviewPromises);

      message.success("Đánh giá đã được gửi thành công!");
      setReviewModalVisible(false);
      setReviewForms([]);
      await fetchOrder();
    } catch (error: any) {
      console.error("Review error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Không thể gửi đánh giá!";
      message.error(errorMsg);
    } finally {
      setSubmittingReview(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================
  const getLogDate = (status: string) => {
    const log = order?.shipping_logs?.find(log => log.new_status === status);
    return log ? formatDate(log.created_at) : undefined;
  };

  const renderOrderProgress = () => {
    const s = order?.shipping;
    if (!s) return null;

    if (s.shipping_status === "cancelled" || s.shipping_status === "none") {
      return (
        <div style={{
          padding: 20,
          backgroundColor: "#f5f5f5",
          borderRadius: 8,
          border: "1px solid #d9d9d9",
          textAlign: "center",
        }}>
          <Space direction="vertical" size="middle">
            <CloseCircleOutlined style={{ color: "#8c8c8c", fontSize: 48 }} />
            <div>
              <Text strong style={{ color: "#595959", fontSize: 16, display: "block", marginBottom: 8 }}>
                Đơn hàng đã bị hủy
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                {getLogDate("none") || getLogDate("cancelled") || "Thời gian hủy không xác định"}
              </Text>
            </div>
          </Space>
        </div>
      );
    }

    if (s.shipping_status === "failed") {
      return (
        <Steps
          direction="vertical"
          current={3}
          status="error"
          items={[
            {
              title: "Chờ xử lý",
              description: getLogDate("pending"),
              icon: <ClockCircleOutlined />,
              status: "finish",
            },
            {
              title: "Đang vận chuyển",
              description: getLogDate("in_transit"),
              icon: <TruckOutlined />,
              status: "finish",
            },
            {
              title: "Giao hàng thất bại",
              description: getLogDate("failed"),
              icon: <CloseCircleOutlined />,
              status: "error",
            },
          ]}
        />
      );
    }

    if (["return_processing", "returned", "return_fail"].includes(s.shipping_status)) {
      const currentStep =
        s.shipping_status === "return_processing" ? 4 :
          s.shipping_status === "return_fail" ? 5 :
            s.shipping_status === "returned" ? 5 : 4;

      return (
        <Steps
          direction="vertical"
          current={currentStep}
          status={s.shipping_status === "return_fail" ? "error" : undefined}
          items={[
            { title: "Chờ xử lý", description: getLogDate("pending"), icon: <ClockCircleOutlined />, status: "finish" },
            { title: "Đang vận chuyển", description: getLogDate("in_transit"), icon: <TruckOutlined />, status: "finish" },
            { title: "Đã giao hàng", description: getLogDate("delivered"), icon: <HomeOutlined />, status: "finish" },
            { title: "Đã nhận hàng", description: getLogDate("received"), icon: <CheckCircleOutlined />, status: "finish" },
            {
              title: "Đang xử lý hoàn hàng",
              description: getLogDate("return_processing"),
              icon: <SyncOutlined />,
              status: s.shipping_status === "return_processing" ? "process" : "finish",
            },
            {
              title: s.shipping_status === "return_fail" ? "Hoàn hàng thất bại" : "Đã hoàn hàng",
              description: s.shipping_status === "return_fail" ? getLogDate("return_fail") : getLogDate("returned"),
              icon: s.shipping_status === "return_fail" ? <StopOutlined /> : <RollbackOutlined />,
              status:
                s.shipping_status === "return_fail" ? "error" :
                  s.shipping_status === "returned" ? "finish" : "wait",
            },
          ]}
        />
      );
    }

    const normalSteps = [
      { status: "pending", title: "Chờ xử lý", icon: <ClockCircleOutlined /> },
      { status: "in_transit", title: "Đang vận chuyển", icon: <TruckOutlined /> },
      { status: "delivered", title: "Đã giao hàng", icon: <HomeOutlined /> },
      { status: "received", title: "Đã nhận hàng", icon: <CheckCircleOutlined /> },
    ];

    const currentIndex = normalSteps.findIndex(step => step.status === s.shipping_status);

    return (
      <Steps
        direction="vertical"
        current={currentIndex}
        items={normalSteps.map((step, index) => ({
          title: step.title,
          description: getLogDate(step.status),
          icon: step.icon,
          status: index < currentIndex ? "finish" : index === currentIndex ? "process" : "wait",
        }))}
      />
    );
  };

  const renderActionButtons = () => {
    const s = order?.shipping;
    if (!s) return null;

    const daysLeft = s.received_at ? getDaysUntilReturnExpired(s.received_at) : 0;
    const canReturn = canReturnOrder(s);
    const canCancel = ["pending", "nodone"].includes(s.shipping_status);

    const hasReturnableItems = (order?.items || []).some(item => {
      const hasNoReview = !item.reviews || item.reviews.length === 0;
      const availableQty = item.available_return_quantity ?? 0;
      return hasNoReview && availableQty > 0;
    });

    return (
      <Space size="middle" wrap>
        {canCancel && (
          <Button
            danger
            icon={<CloseCircleOutlined />}
            size="large"
            onClick={() => setCancelModalVisible(true)}
            style={{ height: 45, fontSize: 16, fontWeight: 500 }}
          >
            Hủy đơn hàng
          </Button>
        )}

        {canConfirmReceived(s.shipping_status) && (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            size="large"
            onClick={handleConfirmReceived}
            loading={confirmReceivedLoading}
            style={{ height: 45, fontSize: 16, fontWeight: 500, backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          >
            Đã nhận được hàng
          </Button>
        )}

        {hasReviewedVariants && (
          <Button
            icon={<StarOutlined />}
            size="large"
            onClick={() => setViewReviewsModalVisible(true)}
            style={{ height: 45, fontSize: 16, fontWeight: 500, backgroundColor: "#fff", color: "#faad14", borderColor: "#faad14" }}
          >
            Xem đánh giá
          </Button>
        )}

        {canReview(s.shipping_status) && hasUnreviewedVariants && (
          <Button
            icon={<StarOutlined />}
            size="large"
            onClick={handleOpenReviewModal}
            style={{ height: 45, fontSize: 16, fontWeight: 500, backgroundColor: "#faad14", color: "white", borderColor: "#faad14" }}
          >
            Đánh giá đơn hàng
          </Button>
        )}

        {canReturn && hasReturnableItems && (
          <Button
            icon={<SyncOutlined />}
            size="large"
            onClick={handleOpenReturnModal}
            style={{ height: 45, fontSize: 16, fontWeight: 500, backgroundColor: "#722ed1", color: "white", borderColor: "#722ed1" }}
          >
            Hoàn hàng {daysLeft > 0 && `(còn ${daysLeft} ngày)`}
          </Button>
        )}

        {s.shipping_status === "received" && !canReturn && daysLeft === 0 && (
          <Button
            icon={<CloseCircleOutlined />}
            size="large"
            disabled
            style={{ height: 45, fontSize: 16, fontWeight: 500 }}
          >
            Đã hết hạn hoàn hàng
          </Button>
        )}
      </Space>
    );
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large">
          <div style={{ marginTop: 60 }}>
            <Text>Đang tải chi tiết đơn hàng...</Text>
          </div>
        </Spin>
      </div>
    );
  }

  if (!order) return null;

  // ==================== DERIVED DATA ====================
  const s = order.shipping;
  const fullAddress = [s?.village, s?.commune, s?.district, s?.city]
    .filter(Boolean)
    .join(", ");

  const totalAmount = parseFloat(order.total_amount);
  const finalAmount = parseFloat(order.final_amount);
  const discountAmount = parseFloat(order.discount_amount || "0");
  const shippingFee = parseFloat(s?.shipping_fee || "0");


  // ==================== RENDER ====================
  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 12,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
        }}
        styles={{ body: { padding: "24px" } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Space size="large" wrap>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/orders")}
                size="large"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "none", color: "white" }}
              >
                Quay lại
              </Button>
              <div>
                <Title level={3} style={{ margin: 0, color: "white" }}>
                  Chi tiết đơn hàng
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 16 }}>
                  Mã đơn: <strong>{order.sku}</strong>
                </Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={12} style={{ textAlign: "right" }}>
            {renderActionButtons()}
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Left Column */}<Col xs={24} lg={16}>
          {/* Order Information */}
          <Card
            title={
              <Space>
                <ShoppingOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin đơn hàng</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered>
              <Descriptions.Item label="Ngày đặt hàng">
                <Text strong>{formatDate(order.created_at)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái giao hàng">
                <Tag
                  color={STATUS_COLORS.shipping[s?.shipping_status as keyof typeof STATUS_COLORS.shipping] || "default"}
                  icon={
                    s?.shipping_status === "in_transit" ? <SyncOutlined spin /> :
                      s?.shipping_status === "delivered" ? <CheckCircleOutlined /> :
                        s?.shipping_status === "received" ? <CheckCircleOutlined /> :
                          s?.shipping_status === "failed" ? <CloseCircleOutlined /> :
                            <ClockCircleOutlined />
                  }
                  style={{ fontSize: 14, padding: "6px 14px", fontWeight: 500 }}
                >
                  {STATUS_MAPS.shipping[s?.shipping_status as keyof typeof STATUS_MAPS.shipping] || s?.shipping_status || "—"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng thái thanh toán">
                <Tag
                  color={STATUS_COLORS.payment[order.payment_status as keyof typeof STATUS_COLORS.payment] || "default"}
                  style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                >
                  {STATUS_MAPS.payment[order.payment_status as keyof typeof STATUS_MAPS.payment] || order.payment_status}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Hình thức thanh toán">
                <Tag
                  color={STATUS_COLORS.paymentMethod[order.payment_method as keyof typeof STATUS_COLORS.paymentMethod] || "default"}
                  style={{ fontSize: 14, padding: "4px 12px", fontWeight: 500 }}
                >
                  {STATUS_MAPS.paymentMethod[order.payment_method as keyof typeof STATUS_MAPS.paymentMethod] || order.payment_method}
                </Tag>
              </Descriptions.Item>

              {order.note && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  <Text>{order.note}</Text>
                </Descriptions.Item>
              )}

              {s?.reason && (
                <Descriptions.Item label="Lý do hủy/hoàn" span={2}>
                  <Text type="danger">{s.reason}</Text>
                </Descriptions.Item>
              )}

              {s?.reason_admin && (
                <Descriptions.Item label="Phản hồi Admin" span={2}>
                  <Text type="warning">{s.reason_admin}</Text>
                </Descriptions.Item>
              )}

              {s?.transfer_image && (
                <Descriptions.Item label="Ảnh chuyển khoản" span={2}>
                  <img
                    src={getFullImageUrl(s.transfer_image)}
                    alt="Ảnh chuyển khoản"
                    style={{
                      maxWidth: 100,
                      height: 'auto',
                      borderRadius: 8,
                      border: "2px solid #f0f0f0",
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      Modal.info({
                        width: 800,
                        icon: null,
                        content: (
                          <div style={{ textAlign: 'center' }}>
                            <img
                              src={getFullImageUrl(s.transfer_image!)}
                              alt="Ảnh chuyển khoản"
                              style={{ maxWidth: '100%', borderRadius: 8 }}
                            />
                          </div>
                        ),
                        okText: 'Đóng',
                      });
                    }}
                  />
                </Descriptions.Item>
              )}

            </Descriptions>
          </Card>

          {/* Product Details */}
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>Chi tiết sản phẩm</span>}
            style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            {(order.items || []).map((item, index) => {
              const returnStatus = getItemReturnStatus(item.id);

              return (
                <div key={item.id}>
                  <Row gutter={16} align="middle">
                    <Col>
                      {item.product_image ? (
                        <img
                          src={`http://127.0.0.1:8000/${item.product_image}`}
                          alt={item.product_name}
                          style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 12, border: "2px solid #f0f0f0" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 90,
                            height: 90,
                            backgroundColor: "#f5f5f5",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ShoppingOutlined style={{ fontSize: 36, color: "#ccc" }} />
                        </div>
                      )}
                    </Col>
                    <Col flex={1}>
                      <Text strong style={{ fontSize: 17, display: "block", marginBottom: 8 }}>
                        {item.product_name}
                      </Text>
                      <Space size="large" wrap>
                        {item.size && <Tag color="blue">Size: {item.size}</Tag>}
                        {item.color && <Tag color="purple">Màu: {item.color}</Tag>}
                        {item.reviews && item.reviews.length > 0 && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Đã đánh giá</Tag>
                        )}

                        {/* ✅ Hiển thị trạng thái hoàn hàng */}
                        {returnStatus && (
                          <Tag color={getReturnStatusColor(returnStatus.status)} icon={<SyncOutlined />}>
                            {getReturnStatusText(returnStatus.status)} ({returnStatus.returnedQty} sản phẩm)
                          </Tag>
                        )}
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 15 }}>
                          Số lượng: <strong>{item.quantity}</strong> × {formatCurrency(item.price)}
                        </Text>
                      </div>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 18, color: "#ff4d4f" }}>
                        {formatCurrency(item.total)}
                      </Text>
                    </Col>
                  </Row>
                  {index < order.items.length - 1 && <Divider />}
                </div>
              );
            })}
            <Divider style={{ margin: "24px 0", borderColor: "#d9d9d9" }} />

            <div style={{ backgroundColor: "#fafafa", padding: 20, borderRadius: 8 }}>
              <Row justify="end">
                <Col>
                  <Space direction="vertical" align="end" size="middle" style={{ width: "100%" }}>
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                      <Text style={{ fontSize: 16 }}>Tạm tính:</Text>
                      <Text strong style={{ fontSize: 16 }}>{formatCurrency(totalAmount)}</Text>
                    </div>
                    {shippingFee > 0 && (
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                        <Text style={{ fontSize: 16 }}>Phí vận chuyển:</Text>
                        <Text strong style={{ fontSize: 16 }}>{formatCurrency(shippingFee)}</Text>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                        <Text style={{ fontSize: 16 }}>Giảm giá:</Text>
                        <Text strong style={{ fontSize: 16, color: "#52c41a" }}>-{formatCurrency(discountAmount)}</Text>
                      </div>
                    )}
                    <Divider style={{ margin: "8px 0" }} />
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 60 }}>
                      <Text strong style={{ fontSize: 20 }}>Tổng cộng:</Text>
                      <Text strong style={{ fontSize: 24, color: "#ff4d4f" }}>{formatCurrency(finalAmount)}</Text>
                    </div>
                  </Space>
                </Col>
              </Row>
            </div>
          </Card>

          {returnRequests.length > 0 && (
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ fontSize: 20, color: "#722ed1" }} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin hoàn hàng</span>
                </Space>
              }
              style={{
                marginBottom: 24,
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {returnRequests.map((request, idx) => {
                const refundCalc = calculateRefundAmount(request);
                const hasPartialApproval = refundCalc.approvedItemsCount > 0 &&
                  refundCalc.approvedItemsCount < refundCalc.totalItemsCount;

                return (
                  <div
                    key={request.id}
                    style={{
                      padding: 20,
                      backgroundColor: "#f9f0ff",
                      borderRadius: 12,
                      marginBottom: idx < returnRequests.length - 1 ? 16 : 0,
                    }}
                  >
                    {/* Header với trạng thái */}
                    <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                      <Col>
                        <Space direction="vertical" size={4}>
                          <Space>
                            <Text strong style={{ fontSize: 16 }}>Yêu cầu hoàn hàng #{request.id}</Text>
                            {hasPartialApproval && (
                              <Tag color="blue" style={{ fontSize: 13 }}>
                                Đã duyệt {refundCalc.approvedItemsCount}/{refundCalc.totalItemsCount} sản phẩm
                              </Tag>
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {formatDate(request.requested_at)}
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Tag
                          color={getReturnStatusColor(request.status)}
                          style={{ fontSize: 14, padding: "6px 14px", fontWeight: 500 }}
                          icon={
                            request.status === "pending" ? <ClockCircleOutlined /> :
                              request.status === "approved" ? <CheckCircleOutlined /> :
                                request.status === "completed" ? <CheckCircleOutlined /> :
                                  request.status === "rejected" ? <CloseCircleOutlined /> :
                                    <SyncOutlined spin />
                          }
                        >
                          {getReturnStatusText(request.status)}
                        </Tag>
                      </Col>
                    </Row>

                    {/* Thông tin tài chính */}
                    <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                      {/* Tổng tiền hàng yêu cầu hoàn */}
                      <Descriptions.Item
                        label={
                          <span style={{ textDecoration: hasPartialApproval ? 'line-through' : 'none' }}>
                            Giá trị hàng hoàn
                          </span>
                        }
                      >
                        <Text
                          strong
                          style={{
                            color: "#52c41a",
                            textDecoration: hasPartialApproval ? 'line-through' : 'none'
                          }}
                        >
                          {formatCurrency(request.total_return_amount)}
                        </Text>
                      </Descriptions.Item>

                      {/* Hiển thị tổng tiền đã duyệt nếu khác với tổng yêu cầu */}
                      {hasPartialApproval && (
                        <Descriptions.Item
                          label={<Text strong style={{ color: "#1890ff" }}>Giá trị đã duyệt</Text>}
                        >
                          <Text strong style={{ color: "#1890ff" }}>
                            {formatCurrency(refundCalc.totalApprovedAmount)}
                          </Text>
                        </Descriptions.Item>
                      )}

                      <Descriptions.Item label="Trừ giảm giá">
                        <Text strong style={{ color: "#ff4d4f" }}>
                          -{formatCurrency(hasPartialApproval ? refundCalc.refundedDiscount : request.refunded_discount)}
                        </Text>
                      </Descriptions.Item>

                      {parseFloat(request.shipping_diff) !== 0 && (
                        <Descriptions.Item label="Chênh lệch phí ship">
                          <Text strong style={{ color: parseFloat(request.shipping_diff) > 0 ? "#52c41a" : "#ff4d4f" }}>
                            {parseFloat(request.shipping_diff) > 0 ? "+" : ""}{formatCurrency(request.shipping_diff)}
                          </Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>

                    {/* Box tổng tiền hoàn */}
                    <div
                      style={{
                        backgroundColor: "#fff",
                        padding: 16,
                        borderRadius: 8,
                        border: "2px solid #722ed1",
                        marginBottom: 16,
                      }}
                    >
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text strong style={{ fontSize: 18 }}>
                            Số tiền hoàn{hasPartialApproval ? " (dự kiến)" : ""}:
                          </Text>
                        </Col>
                        <Col>
                          <Text strong style={{ fontSize: 24, color: "#722ed1" }}>
                            {formatCurrency(hasPartialApproval ? refundCalc.estimatedRefund : request.estimated_refund)}
                          </Text>
                        </Col>
                      </Row>
                    </div>

                    {/* Danh sách sản phẩm hoàn */}
                    {request.items && request.items.length > 0 && (
                      <>
                        <Text strong style={{ fontSize: 15, display: "block", marginBottom: 12 }}>
                          Sản phẩm hoàn: ({request.items.length})
                        </Text>
                        <Space direction="vertical" style={{ width: "100%" }} size="small">
                          {request.items.map((item) => {
                            const orderItem = order.items.find(oi => oi.id === item.order_item_id);

                            return (
                              <div
                                key={item.id}
                                style={{
                                  padding: 12,
                                  backgroundColor: "#fff",
                                  borderRadius: 8,
                                  border: "1px solid #d9d9d9",
                                }}
                              >
                                <Row justify="space-between" align="top">
                                  <Col flex={1}>
                                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                                      {/* Tên sản phẩm */}
                                      <div>
                                        <Text strong>{orderItem?.product_name || "Không tìm thấy sản phẩm"}</Text>
                                        {orderItem?.size && <Tag color="blue" style={{ marginLeft: 8 }}>Size: {orderItem.size}</Tag>}
                                        {orderItem?.color && <Tag color="purple">Màu: {orderItem.color}</Tag>}
                                      </div>

                                      {/* Số lượng và giá */}
                                      <Text type="secondary" style={{ fontSize: 13 }}>
                                        Số lượng: {item.quantity} | Hoàn: {formatCurrency(item.refund_amount)}
                                      </Text>

                                      {/* Lý do hoàn */}
                                      {item.reason && (
                                        <div style={{ marginTop: 4 }}>
                                          <Text type="secondary" style={{ fontSize: 13 }}>
                                            <strong>Lý do:</strong> {item.reason}
                                          </Text>
                                        </div>
                                      )}

                                      {/* Phản hồi admin */}
                                      {item.admin_response && (
                                        <div style={{ marginTop: 4 }}>
                                          <Text type="warning" style={{ fontSize: 13 }}>
                                            <strong>Phản hồi:</strong> {item.admin_response}
                                          </Text>
                                        </div>
                                      )}
                                    </Space>
                                  </Col>

                                  {/* Trạng thái item */}
                                  <Col>
                                    <Tag
                                      color={getReturnItemStatusColor(item.status)}
                                      icon={
                                        item.status === "pending" ? <ClockCircleOutlined /> :
                                          item.status === "approved" ? <CheckCircleOutlined /> :
                                            item.status === "completed" ? <CheckCircleOutlined /> :
                                              <CloseCircleOutlined />
                                      }
                                    >
                                      {getReturnItemStatusText(item.status)}
                                    </Tag>
                                  </Col>
                                </Row>
                              </div>
                            );
                          })}
                        </Space>
                      </>
                    )}
                  </div>
                );
              })}
            </Card>
          )}

        </Col>



        {/* Right Column */}
        <Col xs={24} lg={8}>
          {/* Shipping Information */}
          <Card
            title={
              <Space>
                <TruckOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                <span style={{ fontSize: 18, fontWeight: 600 }}>Thông tin vận chuyển</span>
              </Space>
            }
            style={{
              marginBottom: 24,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Mã vận đơn">
                <Text strong style={{ fontSize: 15 }}>{s?.sku || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người nhận">
                <Text strong style={{ fontSize: 15 }}>{s?.shipping_name || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                <Text style={{ fontSize: 15 }}>{s?.shipping_phone || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                <Text style={{ fontSize: 15 }}>{fullAddress || "—"}</Text>
              </Descriptions.Item>
              {s?.notes && (
                <Descriptions.Item label="Ghi chú">
                  <Text style={{ fontSize: 15 }}>{s.notes}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Order Progress */}
          <Card
            title={<span style={{ fontSize: 18, fontWeight: 600 }}>Tiến trình đơn hàng</span>}
            style={{
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {renderOrderProgress()}
          </Card>
        </Col>
      </Row>

      {/* Cancel Order Modal */}
      <Modal
        open={cancelModalVisible}
        onCancel={() => {
          setCancelModalVisible(false);
          setCancelReason("");
        }}
        footer={null}
        width={600}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fff1f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CloseCircleOutlined style={{ fontSize: 28, color: "#ff4d4f" }} />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>
              Hủy đơn hàng
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này
            </Text>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
            Lý do hủy đơn: <Text type="danger">*</Text>
          </Text>
          <TextArea
            placeholder="Nhập lý do hủy đơn hàng..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={4}
            maxLength={500}
            showCount
            style={{ fontSize: 14 }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            size="large"
            onClick={() => {
              setCancelModalVisible(false);
              setCancelReason("");
            }}
          >
            Đóng
          </Button>
          <Button
            danger
            type="primary"
            size="large"
            loading={cancelling}
            onClick={handleCancelOrder}
            icon={<CloseCircleOutlined />}
          >
            Xác nhận hủy
          </Button>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          setReturnItems([]);
        }}
        footer={null}
        width={850}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#f9f0ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SyncOutlined style={{ fontSize: 28, color: "#722ed1" }} />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>
              Yêu cầu hoàn hàng
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Chọn sản phẩm cần hoàn và nhập lý do cho mỗi sản phẩm
            </Text>
          </div>
        </div>

        <div style={{ marginBottom: 24, maxHeight: 500, overflowY: "auto" }}>
          {returnItems.map((item, index) => (
            <div
              key={index}
              style={{
                padding: 16,
                marginBottom: 16,
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                backgroundColor: item.selected ? "#f6ffed" : "#fafafa",
              }}
            >
              <Checkbox
                checked={item.selected}
                onChange={(e) => {
                  const newItems = [...returnItems];
                  newItems[index].selected = e.target.checked;
                  setReturnItems(newItems);
                }}
                style={{ marginBottom: 12 }}
              >
                <Text strong style={{ fontSize: 15 }}>{item.product_name}</Text>
              </Checkbox>

              {item.selected && (
                <>
                  <div style={{ marginBottom: 12, marginLeft: 24 }}>
                    <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 6 }}>
                      Số lượng hoàn:
                    </Text>
                    <InputNumber
                      min={1}
                      max={item.max_quantity}
                      value={item.quantity}
                      onChange={(value) => {
                        const newItems = [...returnItems];
                        const qty = value || 1;
                        newItems[index].quantity = Math.min(Math.max(1, qty), item.max_quantity);
                        setReturnItems(newItems);
                      }}
                      style={{ width: 120 }}
                      addonAfter={`/ ${item.max_quantity}`}
                    />
                  </div>

                  <div style={{ marginLeft: 24 }}>
                    <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 6 }}>
                      Lý do hoàn:
                    </Text>
                    <TextArea
                      placeholder="Nhập lý do hoàn hàng..."
                      value={item.reason}
                      onChange={(e) => {
                        const newItems = [...returnItems];
                        newItems[index].reason = e.target.value;
                        setReturnItems(newItems);
                      }}
                      rows={3}
                      maxLength={500}
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            size="large"
            onClick={() => {
              setReturnModalVisible(false);
              setReturnItems([]);
            }}
          >
            Đóng
          </Button>
          <Button
            type="primary"
            size="large"
            loading={returning}
            onClick={handleReturnOrder}
            icon={<SyncOutlined />}
            style={{
              backgroundColor: "#722ed1",
              borderColor: "#722ed1",
            }}
          >
            Xác nhận hoàn hàng
          </Button>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          setReviewForms([]);
        }}
        footer={null}
        width={850}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fff7e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <StarOutlined style={{ fontSize: 28, color: "#faad14" }} />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>
              Đánh giá sản phẩm
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Chọn sản phẩm bạn muốn đánh giá
            </Text>
          </div>
        </div>

        <div style={{ marginBottom: 24, maxHeight: 500, overflowY: "auto" }}>
          {reviewForms.map((form, index) => (
            <div
              key={index}
              style={{
                padding: 20,
                marginBottom: 16,
                border: "1px solid #e8e8e8",
                borderRadius: 12,
                backgroundColor: form.selected ? "#fffbe6" : "#fafafa",
              }}
            >
              <Checkbox
                checked={form.selected}
                onChange={(e) => {
                  const newForms = [...reviewForms];
                  newForms[index].selected = e.target.checked;
                  setReviewForms(newForms);
                }}
                style={{ marginBottom: 12 }}
              >
                <Text strong style={{ fontSize: 16 }}>{form.product_name}</Text>
              </Checkbox>

              {form.selected && (
                <>
                  <div style={{ marginBottom: 16, marginLeft: 24 }}>
                    <Text style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
                      Đánh giá sao:
                    </Text>
                    <Rate
                      value={form.rating}
                      onChange={(value) => {
                        const newForms = [...reviewForms];
                        newForms[index].rating = value;
                        setReviewForms(newForms);
                      }}
                      style={{ fontSize: 28 }}
                    />
                  </div>

                  <div style={{ marginLeft: 24 }}>
                    <Text style={{ fontSize: 14, display: "block", marginBottom: 8 }}>
                      Nhận xét:
                    </Text>
                    <TextArea
                      placeholder="Nhập đánh giá (tối thiểu 1 ký tự)..."
                      value={form.comment}
                      onChange={(e) => {
                        const newForms = [...reviewForms];
                        newForms[index].comment = e.target.value;
                        setReviewForms(newForms);
                      }}
                      rows={4}
                      maxLength={1000}
                      showCount
                      style={{ fontSize: 14 }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            size="large"
            onClick={() => {
              setReviewModalVisible(false);
              setReviewForms([]);
            }}
          >
            Đóng
          </Button>
          <Button
            type="primary"
            size="large"
            loading={submittingReview}
            onClick={handleSubmitReview}
            icon={<StarOutlined />}
            style={{
              backgroundColor: "#faad14",
              borderColor: "#faad14",
            }}
          >
            Gửi đánh giá
          </Button>
        </div>
      </Modal>

      {/* View Reviews Modal */}
      <Modal
        open={viewReviewsModalVisible}
        onCancel={() => setViewReviewsModalVisible(false)}
        footer={null}
        width={850}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fff7e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <StarOutlined style={{ fontSize: 28, color: "#faad14" }} />
          </div>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>
              Đánh giá đơn hàng
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Các đánh giá của bạn cho đơn hàng <Text strong style={{ color: "#1890ff" }}>{order.sku}</Text>
            </Text></div>
        </div>

        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {(order.items || []).filter(item => item.reviews && item.reviews.length > 0).map((item) => (
            <div
              key={item.id}
              style={{
                padding: 20,
                backgroundColor: "#fffbe6",
                borderRadius: 12,
                border: "1px solid #ffe58f",
                marginBottom: 16,
              }}
            >
              <Text strong style={{ fontSize: 16, display: "block", marginBottom: 12 }}>
                {item.product_name}
                {item.size && ` - Size: ${item.size}`}
                {item.color && ` - Màu: ${item.color}`}
              </Text>

              {item.reviews?.map((review) => (
                <div key={review.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Rate disabled value={review.rating} style={{ fontSize: 16 }} />
                    <Text strong style={{ fontSize: 14 }}>
                      {review.rating}/5
                    </Text>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e8e8e8",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{review.comment}</Text>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <UserOutlined style={{ fontSize: 13, color: "#8c8c8c" }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {order.user?.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      • {formatDate(review.comment_time)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <Button size="large" onClick={() => setViewReviewsModalVisible(false)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default OrderUserDetail;