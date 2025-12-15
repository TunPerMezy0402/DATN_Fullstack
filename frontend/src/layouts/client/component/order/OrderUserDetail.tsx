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
  Tooltip,
  Form,
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
  AlertOutlined,
  InfoCircleOutlined,

} from "@ant-design/icons";
import axios from "axios";
import { provinces, districts, wards } from "vietnam-provinces";

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
  bank_account_number?: string;  
  bank_name?: string;            
  bank_account_name?: string;
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
  product_image?: string;
  reason: string;
  selected: boolean;
  images: string[];
}


interface ReturnRequest {
  id: number;
  order_id: number;
  status: string;
  refund_30k: boolean;
  created_at: string;
  items_count: number;
  total_return_amount: string;
  estimated_refund: string;
  estimated_refund_min: string; // ✅ THÊM LẠI
  estimated_refund_max: string; // ✅ THÊM LẠI
  refund_explanation: string;
  admin_note?: string;
  items: ReturnRequestItem[];
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
  images?: string[];
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
    approved: "Đang xử lý",
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
  return Math.round(parseFloat(String(amount))).toLocaleString("vi-VN") + " VNĐ";
};
const getDaysUntilReturnExpired = (receivedAt: string | null): number => {
  if (!receivedAt) return 0;
  const received = new Date(receivedAt);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 7 - daysPassed);
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
   const [bankForm] = Form.useForm();

  // Review Modal State
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [viewReviewsModalVisible, setViewReviewsModalVisible] = useState(false);
  const [reviewForms, setReviewForms] = useState<ReviewFormItem[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [needsBankInfo, setNeedsBankInfo] = useState(false);

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

  const formatAddress = (shipping: Shipping | null | undefined): string => {
    if (!shipping) return "—";

    const parts: string[] = [];

    // 1. Số nhà/đường
    if (shipping.village?.trim()) {
      parts.push(shipping.village.trim());
    }

    // 2. Phường/xã - SO SÁNH TRỰC TIẾP, KHÔNG PARSE
    if (shipping.commune?.trim()) {
      const ward = wards.find((w) => w.code === shipping.commune);
      if (ward?.name) {
        parts.push(ward.name);
      } else {
        parts.push(shipping.commune); // Fallback hiển thị code
      }
    }

    // 3. Quận/huyện - SO SÁNH TRỰC TIẾP, KHÔNG PARSE
    if (shipping.district?.trim()) {
      const district = districts.find((d) => d.code === shipping.district);
      if (district?.name) {
        parts.push(district.name);
      } else {
        parts.push(shipping.district); // Fallback
      }
    }

    // 4. Tỉnh/thành phố - SO SÁNH TRỰC TIẾP, KHÔNG PARSE
    if (shipping.city?.trim()) {
      const province = provinces.find((p) => p.code === shipping.city);
      if (province?.name) {
        parts.push(province.name);
      } else {
        parts.push(shipping.city); // Fallback
      }
    }

    return parts.length > 0 ? parts.join(", ") : "—";
  };

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
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleOpenReturnModal = () => {
  if (!order) return;

  // ✅ KIỂM TRA THÔNG TIN NGÂN HÀNG
  const hasBankInfo = !!(
    order.user.bank_account_number && 
    order.user.bank_name && 
    order.user.bank_account_name
  );
  
  setNeedsBankInfo(!hasBankInfo);

  // ✅ NẾU CHƯA CÓ, SET FORM RỖNG
  if (!hasBankInfo) {
    bankForm.resetFields();
  } else {
    // ✅ NẾU CÓ RỒI, ĐIỀN SẴN
    bankForm.setFieldsValue({
      bank_account_number: order.user.bank_account_number,
      bank_name: order.user.bank_name,
      bank_account_name: order.user.bank_account_name,
    });
  }

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
        product_image: item.product_image,
        quantity: availableQty,
        max_quantity: availableQty,
        reason: "",
        selected: false,
        images: [],
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

  // ✅ KIỂM TRA THÔNG TIN NGÂN HÀNG NẾU CẦN
  if (needsBankInfo) {
    try {
      await bankForm.validateFields();
    } catch {
      message.warning("Vui lòng điền đầy đủ thông tin ngân hàng!");
      return;
    }
  }

  try {
    setReturning(true);
    const token = getAuthToken();

    const items = selectedItems.map(item => ({
      order_item_id: Number(item.order_item_id),
      variant_id: Number(item.variant_id),
      quantity: Number(item.quantity),
      reason: String(item.reason.trim()),
      images: item.images,
    }));

    // ✅ THÊM THÔNG TIN NGÂN HÀNG VÀO PAYLOAD NẾU CẦN
    const payload: any = { items };
    
    if (needsBankInfo) {
      const bankValues = bankForm.getFieldsValue();
      payload.bank_account_number = bankValues.bank_account_number;
      payload.bank_name = bankValues.bank_name;
      payload.bank_account_name = bankValues.bank_account_name;
    }

    await axios.post(
      `${API_URL}/orders/${id}/return`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    message.success("Yêu cầu hoàn hàng đã được gửi thành công!");
    setReturnModalVisible(false);
    setReturnItems([]);
    bankForm.resetFields(); // ✅ RESET FORM
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
    const canCancel = ["pending", "nodone"].includes(s.shipping_status);

    // ✅ Kiểm tra trạng thái đã giao hàng
    const isDelivered = s.shipping_status === "delivered";
    const isReceived = s.shipping_status === "received";

    const hasReturnableItems = (order?.items || []).some(item => {
      const hasNoReview = !item.reviews || item.reviews.length === 0;
      const availableQty = item.available_return_quantity ?? 0;
      return hasNoReview && availableQty > 0;
    });

    return (
      <Space size="middle" wrap>
        {/* Nút hủy đơn */}
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

        {/* ✅ Nút xác nhận nhận hàng - CHỈ hiển thị khi delivered */}
        {isDelivered && (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            size="large"
            onClick={handleConfirmReceived}
            loading={confirmReceivedLoading}
            style={{
              height: 45,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "#52c41a",
              borderColor: "#52c41a"
            }}
          >
            Đã nhận được hàng
          </Button>
        )}

        {/* ✅ Nút hoàn hàng - CHỈ hiển thị khi delivered (song song với nút nhận hàng) */}
        {isDelivered && hasReturnableItems && (
          <Button
            icon={<SyncOutlined />}
            size="large"
            onClick={handleOpenReturnModal}
            style={{
              height: 45,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "#722ed1",
              color: "white",
              borderColor: "#722ed1"
            }}
          >
            Hoàn hàng
          </Button>
        )}

        {/* Nút xem đánh giá */}
        {hasReviewedVariants && (
          <Button
            icon={<StarOutlined />}
            size="large"
            onClick={() => setViewReviewsModalVisible(true)}
            style={{
              height: 45,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "#fff",
              color: "#faad14",
              borderColor: "#faad14"
            }}
          >
            Xem đánh giá
          </Button>
        )}

        {/* ✅ Nút đánh giá - CHỈ hiển thị khi received hoặc return_processing */}
        {canReview(s.shipping_status) && hasUnreviewedVariants && (
          <Button
            icon={<StarOutlined />}
            size="large"
            onClick={handleOpenReviewModal}
            style={{
              height: 45,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: "#faad14",
              color: "white",
              borderColor: "#faad14"
            }}
          >
            Đánh giá đơn hàng
          </Button>
        )}

        {/* ✅ BỎ NÚT HOÀN HÀNG Ở ĐÂY - Không hiển thị song song với đánh giá nữa */}

        {/* Nút hết hạn hoàn hàng - CHỈ hiển thị khi received và hết hạn */}
        {isReceived && daysLeft === 0 && (
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
  const fullAddress = formatAddress(s);

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
                const totalReturnAmount = parseFloat(request.total_return_amount || "0");
                const estimatedRefund = parseFloat(request.estimated_refund || "0");
                const estimatedRefundMin = parseFloat(request.estimated_refund_min || "0");
                const estimatedRefundMax = parseFloat(request.estimated_refund_max || "0");
                const orderTotal = parseFloat(order.total_amount);
                const isFreeship = orderTotal >= 500000;
                const canRefund30k = !isFreeship;

                // ✅ KIỂM TRA XEM CÓ KHOẢNG GIÁ KHÔNG (chỉ hiển thị nếu status = pending)
                const hasRange = request.status === "pending" &&
                  estimatedRefundMin !== estimatedRefundMax &&
                  estimatedRefundMin !== estimatedRefund;

                return (
                  <div
                    key={request.id}
                    style={{
                      padding: 20,
                      backgroundColor: "#f9f0ff",
                      borderRadius: 12,
                      marginBottom: idx < returnRequests.length - 1 ? 16 : 0,
                      border: `2px solid ${request.status === "pending"
                        ? "#faad14"
                        : request.status === "completed"
                          ? "#52c41a"
                          : "#ff4d4f"
                        }`,
                    }}
                  >
                    {/* ==================== HEADER ====================  */}
                    <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                      <Col>
                        <Space direction="vertical" size={4}>
                          <Text strong style={{ fontSize: 16 }}>
                            Yêu cầu hoàn hàng
                          </Text>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {formatDate(request.created_at)} • {request.items_count} sản phẩm
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Tag
                          color={getReturnStatusColor(request.status)}
                          style={{ fontSize: 14, padding: "6px 14px", fontWeight: 500 }}
                          icon={
                            request.status === "pending" ? (
                              <ClockCircleOutlined />
                            ) : request.status === "completed" ? (
                              <CheckCircleOutlined />
                            ) : (
                              <CloseCircleOutlined />
                            )
                          }
                        >
                          {getReturnStatusText(request.status)}
                        </Tag>
                      </Col>
                    </Row>

                    <div
                      style={{
                        backgroundColor: "#fff",
                        padding: 16,
                        borderRadius: 8,
                        border: "2px solid #722ed1",
                        marginBottom: 16,
                      }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Text strong style={{ fontSize: 16 }}>
                              {request.status === "pending" ? "Tiền hoàn dự kiến:" : "Tiền hoàn thực tế:"}
                            </Text>
                          </Col>
                          <Col>
                            {request.status === "pending" && hasRange ? (
                              // Pending với range: hiển thị khoảng giá
                              <Text strong style={{ fontSize: 20, color: "#722ed1" }}>
                                {formatCurrency(estimatedRefundMin)} - {formatCurrency(estimatedRefundMax)}
                              </Text>
                            ) : (
                              // Approved/Completed hoặc Pending không có range: hiển thị số tiền chính xác
                              <Text strong style={{ fontSize: 20, color: "#722ed1" }}>
                                {formatCurrency(estimatedRefund)}
                              </Text>
                            )}
                          </Col>
                        </Row>

                        {/* ✅ HIỂN THỊ HOÀN 30K NẾU ĐƯỢC TÍCH */}
                        {request.refund_30k && canRefund30k && (
                          <div
                            style={{
                              padding: 12,
                              backgroundColor: "#f6ffed",
                              borderRadius: 6,
                              border: "2px solid #52c41a",
                            }}
                          >
                            <Space>
                              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />
                              <Text strong style={{ fontSize: 14, color: "#389e0d" }}>
                                Được hoàn thêm 30.000đ tiền ship
                              </Text>
                            </Space>
                          </div>
                        )}

                        {/* ❌ THÔNG BÁO KHÔNG ÁP DỤNG NẾU ĐƠN >= 500K */}
                        {request.refund_30k && !canRefund30k && (
                          <div
                            style={{
                              padding: 12,
                              backgroundColor: "#fff1f0",
                              borderRadius: 6,
                              border: "1px solid #ffccc7",
                            }}
                          >
                            <Space>
                              <InfoCircleOutlined style={{ color: "#ff4d4f", fontSize: 16 }} />
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                Đơn hàng {'>='} 500k (đã freeship), không áp dụng hoàn 30k
                              </Text>
                            </Space>
                          </div>
                        )}
                      </Space>
                    </div>

                    {/* ==================== DANH SÁCH SẢN PHẨM HOÀN ====================  */}
                    {request.items && request.items.length > 0 && (
                      <>
                        <Divider style={{ margin: "16px 0" }} />
                        <Text
                          strong
                          style={{ fontSize: 15, display: "block", marginBottom: 12 }}
                        >
                          Sản phẩm hoàn ({request.items.length})
                        </Text>

                        <Space direction="vertical" style={{ width: "100%" }} size="middle">
                          {request.items.map((item) => {
                            const orderItem = order?.items.find(
                              (oi) => oi.id === item.order_item_id
                            );
                            const isApproved =
                              item.status === "approved" || item.status === "completed";

                            return (
                              <div
                                key={item.id}
                                style={{
                                  padding: 14,
                                  backgroundColor: isApproved ? "#f6ffed" : "#fff",
                                  borderRadius: 8,
                                  border: `2px solid ${isApproved ? "#52c41a" : "#d9d9d9"
                                    }`,
                                }}
                              >
                                <Row justify="space-between" align="top" gutter={16}>
                                  {/* Thông tin sản phẩm */}
                                  <Col flex={1}>
                                    <Space
                                      direction="vertical"
                                      size={6}
                                      style={{ width: "100%" }}
                                    >
                                      {/* Tên sản phẩm */}
                                      <div>
                                        <Text strong style={{ fontSize: 15 }}>
                                          {orderItem?.product_name || "Không tìm thấy"}
                                        </Text>
                                        <Space size="small" style={{ marginLeft: 8 }}>
                                          {orderItem?.size && (
                                            <Tag color="blue">Size: {orderItem.size}</Tag>
                                          )}
                                          {orderItem?.color && (
                                            <Tag color="purple">Màu: {orderItem.color}</Tag>
                                          )}
                                        </Space>
                                      </div>

                                      {/* Số lượng & Tiền hoàn */}
                                      <Text type="secondary" style={{ fontSize: 14 }}>
                                        Số lượng: <strong>{item.quantity}</strong> |{" "}
                                        <span style={{ color: "#52c41a" }}>
                                          Hoàn:{" "}
                                          <strong>
                                            {formatCurrency(item.refund_amount)}
                                          </strong>
                                        </span>
                                      </Text>

                                      {/* Lý do hoàn */}
                                      {item.reason && (
                                        <div>
                                          <Text type="secondary" style={{ fontSize: 13 }}>
                                            <strong>Lý do:</strong> {item.reason}
                                          </Text>
                                        </div>
                                      )}

                                      {/* Phản hồi admin */}
                                      {item.admin_response && (
                                        <div
                                          style={{
                                            padding: 10,
                                            backgroundColor: "#ffeaa7",
                                            borderRadius: 6,
                                          }}
                                        >
                                          <Text type="warning" style={{ fontSize: 13 }}>
                                            <strong>Phản hồi:</strong>{" "}
                                            {item.admin_response}
                                          </Text>
                                        </div>
                                      )}

                                      {/* Hình ảnh */}
                                      {item.images && item.images.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                          <Text
                                            type="secondary"
                                            style={{
                                              fontSize: 13,
                                              display: "block",
                                              marginBottom: 8,
                                            }}
                                          >
                                            <strong>Hình ảnh ({item.images.length}):</strong>
                                          </Text>
                                          <AntImage.PreviewGroup>
                                            <Space size={8} wrap>
                                              {item.images.map((imgPath, imgIndex) => (
                                                <AntImage
                                                  key={imgIndex}
                                                  src={getFullImageUrl(imgPath)}
                                                  alt={`Return image ${imgIndex + 1}`}
                                                  width={70}
                                                  height={70}
                                                  style={{
                                                    objectFit: "cover",
                                                    borderRadius: 6,
                                                    border: "2px solid #e8e8e8",
                                                    cursor: "pointer",
                                                  }}
                                                  preview={{
                                                    mask: (
                                                      <div style={{ fontSize: 11 }}>
                                                        Xem ảnh
                                                      </div>
                                                    ),
                                                  }}
                                                />
                                              ))}
                                            </Space>
                                          </AntImage.PreviewGroup>
                                        </div>
                                      )}
                                    </Space>
                                  </Col>

                                  {/* Status badge */}
                                  <Col style={{ textAlign: "center" }}>
                                    <Tag
                                      color={getReturnItemStatusColor(item.status)}
                                      style={{
                                        fontSize: 13,
                                        padding: "6px 10px",
                                        fontWeight: 500,
                                      }}
                                      icon={
                                        item.status === "pending" ? (
                                          <ClockCircleOutlined />
                                        ) : item.status === "approved" ||
                                          item.status === "completed" ? (
                                          <CheckCircleOutlined />
                                        ) : (
                                          <CloseCircleOutlined />
                                        )
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

      <Modal
        open={returnModalVisible}
        onCancel={() => {
          setReturnModalVisible(false);
          setReturnItems([]);
        }}
        footer={null}
        width={900}
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
              Chọn sản phẩm cần hoàn và nhập lý do cho mỗi sản phẩm. Bạn có thể upload tối đa 5 ảnh cho mỗi sản phẩm.
            </Text>
          </div>
        </div>
         {needsBankInfo && (
    <div style={{ 
      marginBottom: 24, 
      padding: 16, 
      backgroundColor: "#fff7e6", 
      borderRadius: 8,
      border: "2px solid #faad14"
    }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <AlertOutlined style={{ color: "#faad14", fontSize: 18 }} />
        <Text strong style={{ fontSize: 16, color: "#d48806" }}>
          Thông tin nhận tiền hoàn
        </Text>
      </div>
      <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 16 }}>
        Vui lòng cung cấp thông tin tài khoản ngân hàng để nhận tiền hoàn
      </Text>
      
      <Form form={bankForm} layout="vertical">
        <Form.Item
          label="Số tài khoản"
          name="bank_account_number"
          rules={[{ required: true, message: "Vui lòng nhập số tài khoản" }]}
        >
          <Input placeholder="Nhập số tài khoản ngân hàng" />
        </Form.Item>

        <Form.Item
          label="Tên ngân hàng"
          name="bank_name"
          rules={[{ required: true, message: "Vui lòng nhập tên ngân hàng" }]}
        >
          <Input placeholder="VD: Vietcombank, Techcombank, ..." />
        </Form.Item>

        <Form.Item
          label="Tên chủ tài khoản"
          name="bank_account_name"
          rules={[{ required: true, message: "Vui lòng nhập tên chủ tài khoản" }]}
        >
          <Input placeholder="Tên chủ tài khoản (viết hoa, không dấu)" />
        </Form.Item>
      </Form>
    </div>
  )}

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
              {/* ✅ HEADER: CHECKBOX + ẢNH SẢN PHẨM + TÊN */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Checkbox
                  checked={item.selected}
                  onChange={(e) => {
                    const newItems = [...returnItems];
                    newItems[index].selected = e.target.checked;
                    setReturnItems(newItems);
                  }}
                />

                {/* ✅ ẢNH SẢN PHẨM */}
                {item.product_image ? (
                  <img
                    src={`http://127.0.0.1:8000/${item.product_image}`}
                    alt={item.product_name}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid #d9d9d9",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      backgroundColor: "#f0f0f0",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShoppingOutlined style={{ fontSize: 24, color: "#bfbfbf" }} />
                  </div>
                )}

                {/* TÊN SẢN PHẨM */}
                <Text strong style={{ fontSize: 15, flex: 1 }}>
                  {item.product_name}
                </Text>
              </div>

              {item.selected && (
                <div style={{ paddingLeft: 72 }}>
                  {/* Số lượng hoàn */}
                  <div style={{ marginBottom: 12 }}>
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

                  {/* Lý do hoàn */}
                  <div style={{ marginBottom: 12 }}>
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

                  {/* ✅ UPLOAD ẢNH */}
                  <div>
                    <Text type="secondary" style={{ fontSize: 14, display: "block", marginBottom: 6 }}>
                      Hình ảnh sản phẩm (tối đa 5 ảnh):
                    </Text>

                    {/* Preview ảnh đã upload */}
                    {item.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {item.images.map((img, imgIndex) => (
                          <div key={imgIndex} style={{ position: "relative" }}>
                            <img
                              src={img}
                              alt={`Preview ${imgIndex + 1}`}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "2px solid #d9d9d9"
                              }}
                            />
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<CloseCircleOutlined />}
                              onClick={() => {
                                const newItems = [...returnItems];
                                newItems[index].images = newItems[index].images.filter((_, i) => i !== imgIndex);
                                setReturnItems(newItems);
                              }}
                              style={{
                                position: "absolute",
                                top: -8,
                                right: -8,
                                backgroundColor: "white",
                                borderRadius: "50%",
                                padding: 2,
                                minWidth: 24,
                                height: 24
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Button upload */}
                    {item.images.length < 5 && (
                      <Button
                        icon={<StarOutlined />}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png,image/jpg,image/gif';
                          input.multiple = true;
                          input.onchange = async (e: any) => {
                            const files = Array.from(e.target.files || []) as File[];
                            const remainingSlots = 5 - item.images.length;
                            const filesToProcess = files.slice(0, remainingSlots);

                            if (files.length > remainingSlots) {
                              message.warning(`Chỉ có thể upload thêm ${remainingSlots} ảnh`);
                            }

                            try {
                              const base64Images = await Promise.all(
                                filesToProcess.map(file => convertToBase64(file))
                              );

                              const newItems = [...returnItems];
                              newItems[index].images = [...newItems[index].images, ...base64Images];
                              setReturnItems(newItems);
                              message.success(`Đã thêm ${base64Images.length} ảnh`);
                            } catch (error) {
                              message.error("Không thể upload ảnh!");
                            }
                          };
                          input.click();
                        }}
                      >
                        Chọn ảnh ({item.images.length}/5)
                      </Button>
                    )}
                  </div>
                </div>
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