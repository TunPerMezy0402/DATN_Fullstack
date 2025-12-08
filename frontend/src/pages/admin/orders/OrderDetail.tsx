import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Descriptions,
  Divider,
  Typography,
  message,
  Card,
  Tag,
  Spin,
  Button,
  Row,
  Col,
  Space,
  Select,
  Modal,
  Input,
  Form,
  Upload,
  Image,
  Alert,
  Table,
  Collapse,
  Timeline,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  CarOutlined,
  UploadOutlined,
  PictureOutlined,
  BankOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import axios from "axios";
import { provinces, districts, wards } from "vietnam-provinces";

const { Text, Title } = Typography;
const { TextArea } = Input;

// ============================================================
//                         TYPES & CONSTANTS
// ============================================================

interface ReturnItem {
  id: number;
  order_item_id: number;
  variant_id: number;
  quantity: number;
  reason: string;
  status: string;
  refund_amount: number;
  admin_response?: string;
  product_name?: string;
  product_image?: string;
  size?: string;
  color?: string;
}

interface ReturnRequest {
  id: number;
  status: string;
  total_return_amount: number;
  refunded_discount: number;
  old_shipping_fee: number;
  new_shipping_fee: number;
  shipping_diff: number;
  estimated_refund: number;
  actual_refund?: number;
  remaining_amount: number;
  requested_at: string;
  processed_at?: string;
  rejected_at?: string;
  note?: string;
  admin_note?: string;
  items: ReturnItem[];
}

interface OrderItem {
  id: number;
  product_name: string;
  product_image?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: string;
  total: number;
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
  full_address?: string;
  received_at?: string;
  city?: string;
  district?: string;
  commune?: string;
  village?: string;
  notes?: string;
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

interface Order {
  id: number;
  sku: string;
  total_amount: string;
  final_amount: string;
  discount_amount?: string;
  payment_status: string;
  payment_method: string;
  note?: string;
  user: User;
  items: OrderItem[];
  shipping: Shipping;
  return_requests?: ReturnRequest[];
}

const API_URL = "http://127.0.0.1:8000/api";
const token = localStorage.getItem("access_token") || "";

const STATUS_MAPS = {
  payment: {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
    refund_processing: "Đang xử lý hoàn tiền",
    failed: "Thanh toán thất bại",
  },
  shipping: {
    pending: "Chờ xử lý",
    in_transit: "Đang vận chuyển",
    delivered: "Đã giao hàng",
    failed: "Giao thất bại",
    returned: "Hoàn hàng thành công",
    none: "Đã hủy",
    nodone: "Chờ thanh toán lại",
    evaluated: "Đã đánh giá",
    return_processing: "Đang xử lý hoàn hàng",
    return_fail: "Hoàn hàng thất bại",
    received: "Đã nhận được hàng",
  },
  return: {
    pending: "Chờ xử lý",
    approved: "Đã chấp nhận",
    completed: "Hoàn thành",
    rejected: "Đã từ chối",
  },
  returnItem: {
    pending: "Chờ xử lý",
    approved: "Đã duyệt",
    rejected: "Đã từ chối",
    completed: "Hoàn thành",
  },
};

const STATUS_COLORS = {
  payment: {
    unpaid: "default",
    paid: "green",
    refunded: "purple",
    refund_processing: "orange",
    failed: "red",
  },
  shipping: {
    pending: "gold",
    in_transit: "blue",
    delivered: "green",
    failed: "red",
    returned: "purple",
    none: "default",
    nodone: "orange",
    evaluated: "cyan",
    return_processing: "geekblue",
    return_fail: "volcano",
    received: "lime",
  },
  return: {
    pending: "gold",
    approved: "blue",
    completed: "green",
    rejected: "red",
  },
  returnItem: {
    pending: "gold",
    approved: "blue",
    rejected: "red",
    completed: "green",
  },
};

// ============================================================
//                      MAIN COMPONENT
// ============================================================

const OrderDetail: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [updatingReturnStatus, setUpdatingReturnStatus] = useState<number | null>(null);
  const [itemActionLoading, setItemActionLoading] = useState<number | null>(null);
  const [form] = Form.useForm();

  // ============================================================
  //                      API CALLS
  // ============================================================

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/admin/orders-admin/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrder(res.data.data);

      if (res.data.data.shipping?.transfer_image) {
        setFileList([{
          uid: "-1",
          name: "transfer_image",
          status: "done",
          url: res.data.data.shipping.transfer_image,
        }]);
      }
    } catch (error) {
      console.error(error);
      message.error("Không thể tải chi tiết đơn hàng!");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (order && isEditMode) {
      form.setFieldsValue({
        shipping_status: order.shipping.shipping_status,
        payment_status: order.payment_status,
        reason_admin: order.shipping.reason_admin || "",
      });
    }
  }, [order, isEditMode, form]);

  // ============================================================
  //                      HANDLERS
  // ============================================================

  const handleUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("transfer_image", file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("Tải ảnh lên thành công");
      return response.data.url;
    } catch (error) {
      message.error("Tải ảnh lên thất bại");
      return null;
    }
  };

  const handleUpdateOrder = async () => {
    if (!order) return;

    try {
      await form.validateFields();
      setUpdating(true);

      const values = form.getFieldsValue();

      if (
        ["return_processing", "returned", "return_fail"].includes(values.shipping_status) &&
        !values.reason_admin?.trim() &&
        !order.shipping?.reason_admin
      ) {
        message.error("Vui lòng nhập phản hồi admin khi xử lý hoàn hàng!");
        setUpdating(false);
        return;
      }

      let transferImage = order.shipping?.transfer_image;
      if (fileList.length > 0 && fileList[0].url) {
        transferImage = fileList[0].url;
      } else if (fileList.length > 0 && fileList[0].originFileObj) {
        const uploadedUrl = await handleUpload(fileList[0].originFileObj);
        if (!uploadedUrl) {
          setUpdating(false);
          return;
        }
        transferImage = uploadedUrl;
      } else if (fileList.length === 0) {
        transferImage = null;
      }

      await axios.put(
        `${API_URL}/admin/orders-admin/${orderId}`,
        {
          shipping_status: values.shipping_status,
          payment_status: values.payment_status,
          reason_admin: values.reason_admin,
          transfer_image: transferImage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      message.success("Cập nhật đơn hàng thành công");
      await fetchOrder();
      setIsEditMode(false);
    } catch (error: any) {
      message.error(error.response?.data?.message || "Bạn chưa nhập đầy đủ thông tin!");
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveItem = async (returnRequestId: number, itemId: number, adminResponse?: string) => {
    try {
      setItemActionLoading(itemId);
      const response = await axios.post(
        `${API_URL}/admin/orders/${orderId}/return-requests/${returnRequestId}/items/${itemId}/approve`,
        { admin_response: adminResponse },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Đã duyệt sản phẩm hoàn hàng!");
      
      // ✅ Cập nhật local state thay vì refetch
      setOrder((prevOrder) => {
        if (!prevOrder) return prevOrder;
        
        const updatedReturnRequests = prevOrder.return_requests?.map((req) => {
          if (req.id === returnRequestId) {
            return {
              ...req,
              ...response.data.data,
              items: response.data.data.items || req.items.map((item) => 
                item.id === itemId 
                  ? { ...item, status: 'approved', admin_response: adminResponse }
                  : item
              ),
            };
          }
          return req;
        });

        return {
          ...prevOrder,
          return_requests: updatedReturnRequests,
        };
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi duyệt sản phẩm");
    } finally {
      setItemActionLoading(null);
    }
  };

  const handleRejectItem = async (returnRequestId: number, itemId: number, adminResponse: string) => {
    if (!adminResponse?.trim()) {
      message.error("Vui lòng nhập lý do từ chối!");
      return;
    }

    try {
      setItemActionLoading(itemId);
      const response = await axios.post(
        `${API_URL}/admin/orders/${orderId}/return-requests/${returnRequestId}/items/${itemId}/reject`,
        { admin_response: adminResponse },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Đã từ chối sản phẩm hoàn hàng!");
      
      // ✅ Cập nhật local state
      setOrder((prevOrder) => {
        if (!prevOrder) return prevOrder;
        
        const updatedReturnRequests = prevOrder.return_requests?.map((req) => {
          if (req.id === returnRequestId) {
            return {
              ...req,
              ...response.data.data,
              items: response.data.data.items || req.items.map((item) => 
                item.id === itemId 
                  ? { ...item, status: 'rejected', admin_response: adminResponse }
                  : item
              ),
            };
          }
          return req;
        });

        return {
          ...prevOrder,
          return_requests: updatedReturnRequests,
        };
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi từ chối sản phẩm");
    } finally {
      setItemActionLoading(null);
    }
  };

  const handleUpdateReturnStatus = async (returnRequestId: number, newStatus: string) => {
    try {
      setUpdatingReturnStatus(returnRequestId);

      const response = await axios.put(
        `${API_URL}/admin/orders/${orderId}/return-requests/${returnRequestId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success("Cập nhật trạng thái yêu cầu hoàn hàng thành công!");
      
      // ✅ Cập nhật local state
      setOrder((prevOrder) => {
        if (!prevOrder) return prevOrder;
        
        const updatedReturnRequests = prevOrder.return_requests?.map((req) =>
          req.id === returnRequestId ? { ...req, ...response.data.data } : req
        );

        return {
          ...prevOrder,
          return_requests: updatedReturnRequests,
        };
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi cập nhật trạng thái");
    } finally {
      setUpdatingReturnStatus(null);
    }
  };

  // ============================================================
  //                      HELPERS
  // ============================================================

  const getFullImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http")) return imagePath;
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}/${imagePath.replace(/^\//, "")}`;
  };

  const calculateRefundAmount = (returnRequest: ReturnRequest) => {
    const approvedItems = returnRequest.items.filter(
      (item) => item.status === "approved" || item.status === "completed"
    );

    const totalApprovedAmount = approvedItems.reduce((sum, item) => sum + item.refund_amount, 0);

    const refundedDiscount =
      returnRequest.total_return_amount > 0
        ? (totalApprovedAmount / returnRequest.total_return_amount) * returnRequest.refunded_discount
        : 0;

    const shippingDiff = returnRequest.shipping_diff || 0;
    const estimatedRefund = totalApprovedAmount - refundedDiscount - shippingDiff;

    return {
      totalApprovedAmount,
      refundedDiscount,
      estimatedRefund: Math.max(0, estimatedRefund),
      approvedItemsCount: approvedItems.length,
      totalItemsCount: returnRequest.items.length,
      shippingDiff,
    };
  };

  const getAvailableReturnStatuses = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      pending: ["pending", "approved", "rejected"],
      approved: ["approved", "completed"],
      rejected: ["rejected"],
      completed: ["completed"],
    };

    return (transitions[currentStatus] || [currentStatus]).map((status) => ({
      value: status,
      label: STATUS_MAPS.return[status as keyof typeof STATUS_MAPS.return] || status,
      disabled: status === currentStatus,
    }));
  };

const formatAddress = (shipping: Shipping | null | undefined): string => {
  if (!shipping) return "—";

  const parts: string[] = [];

  // ✅ 1. Thêm số nhà/thôn xóm
  if (shipping.village) {
    parts.push(shipping.village);
  }

  // ✅ 2. Tìm và thêm TÊN xã/phường (không phải code)
  if (shipping.commune) {
    const communeName = wards.find((w) => w.code === shipping.commune)?.name || shipping.commune;
    parts.push(communeName);
  }

  // ✅ 3. Tìm và thêm TÊN quận/huyện
  if (shipping.district) {
    const districtName = districts.find((d) => d.code === shipping.district)?.name || shipping.district;
    parts.push(districtName);
  }

  // ✅ 4. Tìm và thêm TÊN tỉnh/thành phố
  if (shipping.city) {
    const cityName = provinces.find((p) => p.code === shipping.city)?.name || shipping.city;
    parts.push(cityName);
  }

  // ✅ 5. Thêm ghi chú nếu có
  if (shipping.notes) {
    parts.push(`(${shipping.notes})`);
  }

  return parts.length > 0 ? parts.join(", ") : "—";
};

  // ============================================================
  //                      UPLOAD PROPS
  // ============================================================

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
      return true;
    },
    beforeUpload: (file) => {
      if (!file.type.startsWith("image/")) {
        message.error("Chỉ được tải lên file ảnh!");
        return Upload.LIST_IGNORE;
      }

      if (file.size / 1024 / 1024 > 5) {
        message.error("Kích thước ảnh không được vượt quá 5MB!");
        return Upload.LIST_IGNORE;
      }

      const newFile: UploadFile = {
        uid: file.uid,
        name: file.name,
        status: "uploading",
      };

      setFileList([newFile]);

      handleUpload(file).then((url) => {
        if (url) {
          setFileList([{ ...newFile, status: "done", url }]);
        } else {
          setFileList([]);
        }
      });

      return false;
    },
    fileList,
    maxCount: 1,
    listType: "picture-card",
    accept: "image/*",
    disabled: !isEditMode,
  };

  // ============================================================
  //                      RENDER RETURN REQUESTS
  // ============================================================

  const renderReturnRequests = () => {
    if (!order?.return_requests || order.return_requests.length === 0) return null;

    return (
      <Card
        title={
          <Space>
            <SyncOutlined />
            <span>Lịch sử yêu cầu hoàn hàng</span>
          </Space>
        }
        style={{ marginBottom: 24, borderRadius: 8 }}
      >
        <Collapse
          items={order.return_requests.map((returnRequest) => ({
            key: returnRequest.id,
            label: (
              <Row justify="space-between" align="middle" style={{ width: "100%" }}>
                <Col>
                  <Space>
                    <Text strong>Yêu cầu #{returnRequest.id}</Text>
                    <Tag color={STATUS_COLORS.return[returnRequest.status as keyof typeof STATUS_COLORS.return]}>
                      {STATUS_MAPS.return[returnRequest.status as keyof typeof STATUS_MAPS.return]}
                    </Tag>
                  </Space>
                </Col>
                <Col>
                  <Space size="large">
                    <Text type="secondary">
                      {new Date(returnRequest.requested_at).toLocaleString("vi-VN")}
                    </Text>

                    <Select
                      value={returnRequest.status}
                      onChange={(value) => {
                        Modal.confirm({
                          title: "Xác nhận cập nhật trạng thái",
                          content: `Bạn có chắc chắn muốn chuyển sang "${STATUS_MAPS.return[value as keyof typeof STATUS_MAPS.return]}"?`,
                          okText: "Xác nhận",
                          cancelText: "Hủy",
                          onOk: () => handleUpdateReturnStatus(returnRequest.id, value),
                        });
                      }}
                      loading={updatingReturnStatus === returnRequest.id}
                      style={{ minWidth: 160 }}
                      options={getAvailableReturnStatuses(returnRequest.status)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={updatingReturnStatus === returnRequest.id}
                    />
                  </Space>
                </Col>
              </Row>
            ),
            children: (
              <div>
                <Timeline
                  style={{ marginBottom: 24 }}
                  items={[
                    {
                      color: "blue",
                      children: (
                        <div>
                          <Text strong>Yêu cầu hoàn hàng</Text>
                          <br />
                          <Text type="secondary">
                            {new Date(returnRequest.requested_at).toLocaleString("vi-VN")}
                          </Text>
                        </div>
                      ),
                    },
                    ...(returnRequest.processed_at
                      ? [
                          {
                            color: "green",
                            children: (
                              <div>
                                <Text strong>Đã xử lý</Text>
                                <br />
                                <Text type="secondary">
                                  {new Date(returnRequest.processed_at).toLocaleString("vi-VN")}
                                </Text>
                              </div>
                            ),
                          },
                        ]
                      : []),
                    ...(returnRequest.rejected_at
                      ? [
                          {
                            color: "red",
                            children: (
                              <div>
                                <Text strong>Đã từ chối</Text>
                                <br />
                                <Text type="secondary">
                                  {new Date(returnRequest.rejected_at).toLocaleString("vi-VN")}
                                </Text>
                              </div>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />

                <Card type="inner" title="Danh sách sản phẩm hoàn" style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={returnRequest.items}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: "Hình ảnh",
                        dataIndex: "product_image",
                        width: 100,
                        render: (image: string, item: ReturnItem) =>
                          item.product_image ? (
                            <img
                              src={getFullImageUrl(item.product_image)}
                              alt={item.product_name}
                              style={{
                                width: 80,
                                height: 80,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #f0f0f0",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                backgroundColor: "#f5f5f5",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <ShoppingCartOutlined style={{ fontSize: 32, color: "#ccc" }} />
                            </div>
                          ),
                      },
                      {
                        title: "Sản phẩm",
                        dataIndex: "product_name",
                        render: (name: string, record: ReturnItem) => (
                          <div>
                            <Text strong>{name || "—"}</Text>
                            <br />
                            {record.size && <Text type="secondary">Size: {record.size} </Text>}
                            {record.color && <Text type="secondary">Màu: {record.color}</Text>}
                          </div>
                        ),
                      },
                      {
                        title: "Số lượng",
                        dataIndex: "quantity",
                        align: "center",
                        width: 100,
                      },
                      {
                        title: "Tiền hoàn",
                        dataIndex: "refund_amount",
                        align: "right",
                        width: 120,
                        render: (amount: number) => (
                          <Text strong style={{ color: "#ff4d4f" }}>
                            {amount?.toLocaleString("vi-VN")}₫
                          </Text>
                        ),
                      },
                      {
                        title: "Trạng thái",
                        dataIndex: "status",
                        align: "center",
                        width: 120,
                        render: (status: string) => (
                          <Tag color={STATUS_COLORS.returnItem[status as keyof typeof STATUS_COLORS.returnItem]}>
                            {STATUS_MAPS.returnItem[status as keyof typeof STATUS_MAPS.returnItem] || status}
                          </Tag>
                        ),
                      },
                      {
                        title: "Thao tác",
                        key: "action",
                        align: "center",
                        width: 150,
                        render: (_: any, record: ReturnItem) => {
                          if (record.status === "pending" && returnRequest.status === "pending") {
                            return (
                              <Space direction="vertical" size="small">
                                <Popconfirm
                                  title="Duyệt sản phẩm hoàn?"
                                  onConfirm={() => handleApproveItem(returnRequest.id, record.id)}
                                  okText="Duyệt"
                                  cancelText="Hủy"
                                >
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    loading={itemActionLoading === record.id}
                                    block
                                  >
                                    Duyệt
                                  </Button>
                                </Popconfirm>

                                <Button
                                  danger
                                  size="small"
                                  icon={<CloseCircleOutlined />}
                                  loading={itemActionLoading === record.id}
                                  onClick={() => {
                                    Modal.confirm({
                                      title: "Từ chối sản phẩm hoàn?",
                                      content: (
                                        <div>
                                          <Text>Lý do từ chối:</Text>
                                          <TextArea
                                            id="reject-reason"
                                            rows={3}
                                            placeholder="Nhập lý do từ chối..."
                                            style={{ marginTop: 8 }}
                                          />
                                        </div>
                                      ),
                                      okText: "Từ chối",
                                      cancelText: "Hủy",
                                      okButtonProps: { danger: true },
                                      onOk: () => {
                                        const reason = (
                                          document.getElementById("reject-reason") as HTMLTextAreaElement
                                        )?.value;
                                        return handleRejectItem(returnRequest.id, record.id, reason);
                                      },
                                    });
                                  }}
                                  block
                                >
                                  Từ chối
                                </Button>
                              </Space>
                            );
                          }

                          return (
                            <Tag color={STATUS_COLORS.returnItem[record.status as keyof typeof STATUS_COLORS.returnItem]}>
                              {STATUS_MAPS.returnItem[record.status as keyof typeof STATUS_MAPS.returnItem]}
                            </Tag>
                          );
                        },
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (record: ReturnItem) => (
                        <div style={{ paddingLeft: 24 }}>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>Lý do hoàn: </Text>
                            <Text>{record.reason || "—"}</Text>
                          </div>
                          {record.admin_response && (
                            <div>
                              <Text strong>Phản hồi admin: </Text>
                              <Text>{record.admin_response}</Text>
                            </div>
                          )}
                        </div>
                      ),
                    }}
                  />
                </Card>

                <Card type="inner" title="Chi tiết hoàn tiền">
                  {(() => {
                    const refundCalc = calculateRefundAmount(returnRequest);
                    const hasPartialApproval =
                      refundCalc.approvedItemsCount > 0 &&
                      refundCalc.approvedItemsCount < refundCalc.totalItemsCount;

                    return (
                      <Row gutter={[16, 16]}>
                        <Col span={24}>
                          {hasPartialApproval && (
                            <Alert
                              message={`Đã duyệt ${refundCalc.approvedItemsCount}/${refundCalc.totalItemsCount} sản phẩm`}
                              type="info"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                          )}

                          <div style={{ backgroundColor: "#fafafa", padding: 16, borderRadius: 8 }}>
                            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                              <Row justify="space-between">
                                <Text
                                  style={{ textDecoration: hasPartialApproval ? "line-through" : "none" }}
                                >
                                  Giá trị hàng hoàn:
                                </Text>
                                <Text
                                  style={{ textDecoration: hasPartialApproval ? "line-through" : "none" }}
                                >
                                  {returnRequest.total_return_amount?.toLocaleString("vi-VN")}₫
                                </Text>
                              </Row>

                              {refundCalc.totalApprovedAmount !== returnRequest.total_return_amount && (
                                <Row justify="space-between">
                                  <Text strong style={{ color: "#1890ff" }}> 
                                    Tổng tiền hàng đã duyệt:
                                  </Text>
                                  <Text strong style={{ color: "#1890ff" }}>
                                    {refundCalc.totalApprovedAmount?.toLocaleString("vi-VN")}₫
                                  </Text>
                                </Row>
                              )}

                              {refundCalc.refundedDiscount > 0 && (
                                <Row justify="space-between">
                                  <Text>Trừ giảm giá tỷ lệ:</Text>
                                  <Text strong style={{ color: "#ff4d4f" }}>
                                    -{refundCalc.refundedDiscount?.toLocaleString("vi-VN", {
                                      maximumFractionDigits: 0,
                                    })}₫
                                  </Text>
                                </Row>
                              )}

                              {Math.abs(refundCalc.shippingDiff) > 0 && (
                                <Row justify="space-between">
                                  <Text>
                                    {refundCalc.shippingDiff > 0
                                      ? "Cộng phí ship được hoàn:"
                                      : "Trừ phí ship mới:"}
                                  </Text>
                                  <Text
                                    strong
                                    style={{
                                      color: refundCalc.shippingDiff > 0 ? "#52c41a" : "#ff4d4f",
                                    }}
                                  >
                                    {refundCalc.shippingDiff > 0 ? "+" : ""}
                                    {Math.abs(refundCalc.shippingDiff)?.toLocaleString("vi-VN")}₫
                                  </Text>
                                </Row>
                              )}

                              <Divider style={{ margin: "8px 0" }} />

                              <Row justify="space-between">
                                <Text strong style={{ fontSize: 16 }}>
                                  Số tiền hoàn:
                                </Text>
                                <Text strong style={{ fontSize: 18, color: "#52c41a" }}>
                                  {refundCalc.estimatedRefund?.toLocaleString("vi-VN", {
                                    maximumFractionDigits: 0,
                                  })}₫
                                </Text>
                              </Row>
                            </Space>
                          </div>
                        </Col>
                      </Row>
                    );
                  })()}
                </Card>
              </div>
            ),
          }))}
        />
      </Card>
    );
  };

  // ============================================================
  //                      RENDER MAIN UI
  // ============================================================

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: "24px" }}>
        <Card>
          <Text>Không tìm thấy đơn hàng</Text>
        </Card>
      </div>
    );
  }

  const shippingFee = 30000;
  const totalAmount = parseFloat(order.total_amount);
  const finalAmount = parseFloat(order.final_amount);
  const freeShippingThreshold = 500000;
  const isFreeShipping = totalAmount >= freeShippingThreshold;

  let couponDiscount = 0;
  if (isFreeShipping) {
    couponDiscount = totalAmount - finalAmount;
  } else {
    couponDiscount = totalAmount + shippingFee - finalAmount;
  }

  const getAvailableShippingStatuses = (currentStatus: string, paymentStatus: string) => {
    const transitions: Record<string, string[]> = {
      pending: ["pending", "in_transit"],
      in_transit: ["in_transit", "delivered"],
      delivered: ["delivered"],
      received: ["received", "evaluated", "return_processing"],
      failed: ["failed", "return_processing"],
      nodone: ["nodone", "return_processing"],
      return_processing: ["return_processing", "returned", "return_fail"],
      returned: ["returned"],
      return_fail: ["return_fail"],
      evaluated: ["evaluated"],
    };

    let allowedStatuses = transitions[currentStatus] || [currentStatus];

    if (paymentStatus === "refund_processing") {
      allowedStatuses = allowedStatuses.filter(
        (status) => status === currentStatus || status === "return_fail" || status === "returned"
      );
    }

    return allowedStatuses.map((status) => ({
      value: status,
      label: STATUS_MAPS.shipping[status as keyof typeof STATUS_MAPS.shipping] || status,
      disabled: status === currentStatus,
    }));
  };

  const getAvailablePaymentStatuses = (currentPaymentStatus: string, shippingStatus: string) => {
    const statuses: Array<{ value: string; label: string; disabled?: boolean }> = [];

    statuses.push({
      value: currentPaymentStatus,
      label: STATUS_MAPS.payment[currentPaymentStatus as keyof typeof STATUS_MAPS.payment] || currentPaymentStatus,
      disabled: true,
    });

    const validPaymentTransitions: Record<string, string[]> = {
      unpaid: ["paid", "failed"],
      paid: ["refund_processing"],
      refund_processing: ["refunded", "failed"],
      refunded: [],
      failed: [],
    };

    const allowedTransitions = validPaymentTransitions[currentPaymentStatus] || [];

    allowedTransitions.forEach((status) => {
      if (status === "paid" && currentPaymentStatus === "unpaid") {
        if ((order.payment_method === "cod" && shippingStatus === "delivered") || order.payment_method === "vnpay") {
          statuses.push({
            value: "paid",
            label: STATUS_MAPS.payment["paid"],
          });
        }
        return;
      }

      if (status === "refund_processing" && currentPaymentStatus === "paid") {
        if (["return_processing", "returned"].includes(shippingStatus)) {
          statuses.push({
            value: "refund_processing",
            label: STATUS_MAPS.payment["refund_processing"],
          });
        }
        return;
      }

      statuses.push({
        value: status,
        label: STATUS_MAPS.payment[status as keyof typeof STATUS_MAPS.payment],
      });
    });

    return statuses;
  };

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <Card style={{ marginBottom: 24, borderRadius: 8 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin/orders")}>
                Quay lại
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Đơn hàng #{order.sku}
              </Title>
            </Space>
          </Col>
          <Col>
            {!isEditMode ? (
              <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditMode(true)}>
                Chỉnh sửa
              </Button>
            ) : (
              <Space>
                <Button onClick={() => setIsEditMode(false)}>Hủy</Button>
                <Button type="primary" loading={updating} onClick={handleUpdateOrder}>
                  Cập nhật
                </Button>
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <CarOutlined />
                <span>Thông tin vận chuyển</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Descriptions column={1} size="middle">
              <Descriptions.Item label="Mã vận đơn">
                <Text strong>{order.shipping?.sku || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người nhận">
                <Text strong>{order.shipping?.shipping_name || "—"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{order.shipping?.shipping_phone || "—"}</Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <EnvironmentOutlined />
                    Địa chỉ giao hàng
                  </Space>
                }
              >
                {formatAddress(order.shipping)}
              </Descriptions.Item>
              {order.shipping?.received_at && (
                <Descriptions.Item
                  label={
                    <Space>
                      <ClockCircleOutlined />
                      Thời gian nhận hàng
                    </Space>
                  }
                >
                  {new Date(order.shipping.received_at).toLocaleString("vi-VN")}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>Chi tiết sản phẩm</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            {order.items.map((item, index) => (
              <div key={item.id}>
                <Row gutter={16} align="middle">
                  <Col>
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #f0f0f0",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          backgroundColor: "#f5f5f5",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ShoppingCartOutlined style={{ fontSize: 32, color: "#ccc" }} />
                      </div>
                    )}
                  </Col>
                  <Col flex={1}>
                    <Text strong style={{ fontSize: 16, display: "block" }}>
                      {item.product_name}
                    </Text>
                    <Space size="large" style={{ marginTop: 8 }}>
                      {item.size && <Text type="secondary">Kích thước: {item.size}</Text>}
                      {item.color && <Text type="secondary">Màu sắc: {item.color}</Text>}
                      <Text type="secondary">Số lượng: {item.quantity}</Text>
                    </Space>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Đơn giá: </Text>
                      <Text strong>{parseFloat(item.price).toLocaleString("vi-VN")}₫</Text>
                    </div>
                  </Col>
                  <Col>
                    <Text strong style={{ fontSize: 16, color: "#ff4d4f" }}>
                      {item.total.toLocaleString("vi-VN")}₫
                    </Text>
                  </Col>
                </Row>
                {index < order.items.length - 1 && <Divider />}
              </div>
            ))}

            <Divider />

            <div style={{ backgroundColor: "#fafafa", padding: 20, borderRadius: 8 }}>
              <Row justify="end">
                <Col>
                  <Space direction="vertical" align="end" size="middle" style={{ width: "100%" }}>
                    <Row justify="space-between" style={{ width: "100%", gap: 60 }}>
                      <Text style={{ fontSize: 15 }}>Tạm tính:</Text>
                      <Text strong style={{ fontSize: 15 }}>
                        {totalAmount.toLocaleString("vi-VN")}₫
                      </Text>
                    </Row>

                    <Row justify="space-between" style={{ width: "100%", gap: 60 }}>
                      <Text style={{ fontSize: 15 }}>Phí vận chuyển:</Text>
                      {isFreeShipping ? (
                        <Text strong style={{ fontSize: 15, color: "#52c41a" }}>
                          Miễn phí
                        </Text>
                      ) : (
                        <Text strong style={{ fontSize: 15 }}>
                          {shippingFee.toLocaleString("vi-VN")}₫
                        </Text>
                      )}
                    </Row>

                    {couponDiscount > 0 && (
                      <Row justify="space-between" style={{ width: "100%", gap: 60 }}>
                        <Text style={{ fontSize: 15 }}>Mã giảm giá:</Text>
                        <Text strong style={{ fontSize: 15, color: "#ff4d4f" }}>
                          - {couponDiscount.toLocaleString("vi-VN")}₫
                        </Text>
                      </Row>
                    )}

                    <Divider style={{ margin: "8px 0" }} />

                    <Row justify="space-between" style={{ width: "100%", gap: 60 }}>
                      <Text strong style={{ fontSize: 18 }}>
                        Tổng cộng:
                      </Text>
                      <Text strong style={{ fontSize: 20, color: "#ff4d4f" }}>
                        {finalAmount.toLocaleString("vi-VN")}₫
                      </Text>
                    </Row>
                  </Space>
                </Col>
              </Row>
            </div>
          </Card>

          {renderReturnRequests()}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Cập nhật trạng thái" style={{ marginBottom: 24, borderRadius: 8 }}>
            {!isEditMode ? (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Hình thức thanh toán:
                  </Text>
                  <Tag color={order.payment_method === "cod" ? "orange" : "blue"} style={{ fontSize: 14, padding: "4px 12px" }}>
                    {order.payment_method === "cod" ? "Thanh toán khi nhận hàng" : "VNPAY"}
                  </Tag>
                </div>

                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Trạng thái vận chuyển:
                  </Text>
                  <Tag color={STATUS_COLORS.shipping[order.shipping.shipping_status as keyof typeof STATUS_COLORS.shipping]}>
                    {STATUS_MAPS.shipping[order.shipping.shipping_status as keyof typeof STATUS_MAPS.shipping]}
                  </Tag>
                </div>

                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Trạng thái thanh toán:
                  </Text>
                  <Tag color={STATUS_COLORS.payment[order.payment_status as keyof typeof STATUS_COLORS.payment]}>
                    {STATUS_MAPS.payment[order.payment_status as keyof typeof STATUS_MAPS.payment]}
                  </Tag>
                </div>

                {order.shipping?.transfer_image && (
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Ảnh chuyển khoản:
                    </Text>
                    <Image
                      src={order.shipping.transfer_image}
                      alt="Transfer Image"
                      style={{ maxWidth: "100%", borderRadius: 8 }}
                      preview={{ mask: <PictureOutlined style={{ fontSize: 24 }} /> }}
                    />
                  </div>
                )}

                {order.note && (
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Ghi chú:
                    </Text>
                    <Text>{order.note}</Text>
                  </div>
                )}

                {order.shipping?.reason && (
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Lý do hủy/hoàn hàng:
                    </Text>
                    <Text>{order.shipping.reason}</Text>
                  </div>
                )}

                {order.shipping?.reason_admin && (
                  <div>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Phản hồi Admin:
                    </Text>
                    <Text>{order.shipping.reason_admin}</Text>
                  </div>
                )}
              </Space>
            ) : (
              <Form form={form} layout="vertical">
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    Hình thức thanh toán:
                  </Text>
                  <Tag color={order.payment_method === "cod" ? "orange" : "blue"} style={{ fontSize: 14, padding: "4px 12px" }}>
                    {order.payment_method === "cod" ? "Thanh toán khi nhận hàng" : "VNPAY"}
                  </Tag>
                </div>

                <Form.Item
                  label="Trạng thái vận chuyển"
                  name="shipping_status"
                  rules={[{ required: true, message: "Vui lòng chọn trạng thái vận chuyển" }]}
                >
                  <Select
                    style={{ width: "100%" }}
                    options={getAvailableShippingStatuses(order.shipping.shipping_status, order.payment_status)}
                  />
                </Form.Item>

                {order.payment_status === "refund_processing" && (
                  <Form.Item
                    label="Trạng thái thanh toán"
                    name="payment_status"
                    rules={[{ required: true, message: "Vui lòng chọn trạng thái thanh toán" }]}
                  >
                    <Select
                      style={{ width: "100%" }}
                      options={getAvailablePaymentStatuses(order.payment_status, order.shipping.shipping_status)}
                    />
                  </Form.Item>
                )}

                <Form.Item
                  label={
                    <Space>
                      <PictureOutlined />
                      Ảnh chuyển khoản
                    </Space>
                  }
                >
                  <Upload {...uploadProps} listType="picture-card">
                    {fileList.length >= 1 ? null : (
                      <div>
                        <UploadOutlined />
                        <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                      </div>
                    )}
                  </Upload>
                  <div style={{ marginTop: 8, color: "#999", fontSize: "12px" }}>
                    Kích thước tối đa: 5MB. Định dạng: JPG, PNG, JPEG
                  </div>
                </Form.Item>

                {order.note && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Ghi chú:
                    </Text>
                    <Text>{order.note}</Text>
                  </div>
                )}

                {order.shipping?.reason && (
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                      Lý do hủy/hoàn hàng:
                    </Text>
                    <Text>{order.shipping.reason}</Text>
                  </div>
                )}

                <Form.Item
                  label="Phản hồi Admin"
                  name="reason_admin"
                  rules={[
                    {
                      validator: async (_, value) => {
                        const shippingStatus = form.getFieldValue("shipping_status");
                        if (["return_processing", "returned", "return_fail"].includes(shippingStatus) && !value?.trim()) {
                          throw new Error("Phản hồi admin là bắt buộc khi xử lý hoàn hàng");
                        }
                      },
                    },
                  ]}
                >
                  <TextArea rows={4} placeholder="Nhập phản hồi của admin về yêu cầu hủy/hoàn hàng..." />
                </Form.Item>
              </Form>
            )}
          </Card>

          <Card
            title={
              <Space>
                <UserOutlined />
                <span>Thông tin khách hàng</span>
              </Space>
            }
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Descriptions column={1} size="middle">
              <Descriptions.Item
                label={
                  <Space>
                    <UserOutlined />
                    Họ tên
                  </Space>
                }
              >
                <Text strong>{order.user?.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <PhoneOutlined />
                    Số điện thoại
                  </Space>
                }
              >
                {order.user?.phone}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space>
                    <MailOutlined />
                    Email
                  </Space>
                }
              >
                {order.user?.email}
              </Descriptions.Item>

              {order.user?.bank_account_number && (
                <>
                  <Descriptions.Item
                    label={
                      <Space>
                        <CreditCardOutlined />
                        Số tài khoản ngân hàng
                      </Space>
                    }
                  >
                    {order.user.bank_account_number}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label={
                      <Space>
                        <BankOutlined />
                        Tên ngân hàng
                      </Space>
                    }
                  >
                    {order.user.bank_name || "—"}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label={
                      <Space>
                        <UserOutlined />
                        Tên chủ thẻ
                      </Space>
                    }
                  >
                    {order.user.bank_account_name || "—"}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderDetail;