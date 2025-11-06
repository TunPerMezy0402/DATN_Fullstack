import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Button,
    Card,
    Space,
    Typography,
    Divider,
    Table,
    Spin,
    message,
    Row,
    Col,
} from "antd";
import {
    FilePdfOutlined,
    PrinterOutlined,
    ArrowLeftOutlined,
    MailOutlined,
} from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const API_URL = "http://127.0.0.1:8000/api";
const getAuthToken = () =>
    localStorage.getItem("access_token") || localStorage.getItem("token");

interface OrderItem {
    id: number;
    product_name: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
}

interface OrderDetail {
    id: number;
    order_code: string;
    total_amount: number;
    discount_amount: number;
    shipping_fee: number;
    final_amount: number;
    status: string;
    payment_method: string;
    created_at: string;
    items: OrderItem[];
    address: {
        recipient_name: string;
        phone: string;
        village: string;
        commune: string;
        district: string;
        city: string;
    };
}

const formatCurrency = (value: number): string => {
    return value.toLocaleString("vi-VN");
};

const getPaymentMethodText = (method: string): string => {
    const methods: Record<string, string> = {
        cod: "Thanh toán khi nhận hàng",
        vnpay: "VNPay",
        bank_transfer: "Chuyển khoản",
    };
    return methods[method] || method;
};

const InvoicePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<OrderDetail | null>(null);

    useEffect(() => {
        const fetchOrderDetail = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/orders/${id}`, {
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                });
                setOrder(response.data.data || response.data);
            } catch (error) {
                console.error("Error fetching order:", error);
                message.error("Không thể tải thông tin đơn hàng");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOrderDetail();
        }
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            message.loading({ content: "Đang tạo file PDF...", key: "pdf" });

            const element = invoiceRef.current;
            if (!element) return;

            // Load html2pdf from CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.integrity = 'sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBp+5JzXeD7mRN9HDz4Xq9m8Bf6IpHNV/F5wE2E0j3Kw==';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                const opt = {
                    margin: 10,
                    filename: `hoa-don-${order?.order_code}.pdf`,
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                };

                // @ts-ignore - html2pdf is loaded from CDN
                window.html2pdf()
                    .set(opt)
                    .from(element)
                    .save()
                    .then(() => {
                        message.success({ content: "Tải xuống PDF thành công!", key: "pdf" });
                    });
            };

            script.onerror = () => {
                message.error({ content: "Không thể tải thư viện tạo PDF", key: "pdf" });
            };

            document.head.appendChild(script);
        } catch (error) {
            console.error("Error generating PDF:", error);
            message.error({ content: "Không thể tạo file PDF", key: "pdf" });
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <Spin size="large" tip="Đang tải hóa đơn..." />
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <Text>Không tìm thấy đơn hàng</Text>
                <br />
                <Button type="primary" onClick={() => navigate("/orders")}>
                    Quay lại danh sách đơn hàng
                </Button>
            </div>
        );
    }

    const columns = [
        {
            title: "STT",
            dataIndex: "index",
            key: "index",
            width: 60,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: "Tên sản phẩm",
            dataIndex: "product_name",
            key: "product_name",
            render: (name: string, record: OrderItem) => (
                <div>
                    <Text strong>{name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Màu: {record.color} | Size: {record.size}
                    </Text>
                </div>
            ),
        },
        {
            title: "Đơn giá",
            dataIndex: "price",
            key: "price",
            align: "right" as const,
            render: (price: number) => `${formatCurrency(price)}₫`,
        },
        {
            title: "SL",
            dataIndex: "quantity",
            key: "quantity",
            align: "center" as const,
            width: 80,
        },
        {
            title: "Thành tiền",
            key: "total",
            align: "right" as const,
            render: (_: any, record: OrderItem) =>
                `${formatCurrency(record.price * record.quantity)}₫`,
        },
    ];

    return (
        <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px" }}>
            {/* Action Buttons - Hide when printing */}
            <div
                className="no-print"
                style={{
                    maxWidth: 900,
                    margin: "0 auto 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                }}
            >
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate(-1)}
                >
                    Quay lại
                </Button>

                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        In hóa đơn
                    </Button>
                    <Button
                        type="primary"
                        icon={<FilePdfOutlined />}
                        onClick={handleDownloadPDF}
                    >
                        Tải PDF
                    </Button>
                </Space>
            </div>

            {/* Invoice Content */}
            <div
                ref={invoiceRef}
                style={{
                    maxWidth: 900,
                    margin: "0 auto",
                    background: "white",
                    padding: "40px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    borderRadius: 8,
                }}
            >
                {/* Header */}
                <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
                    <Col span={12}>
                        <div>
                            <Title level={2} style={{ margin: 0, color: "#1890ff" }}>
                                CỬA HÀNG THỜI TRANG
                            </Title>
                            <Text style={{ fontSize: 13 }}>
                                Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM
                            </Text>
                            <br />
                            <Text style={{ fontSize: 13 }}>
                                Điện thoại: 1900-xxxx
                            </Text>
                            <br />
                            <Text style={{ fontSize: 13 }}>
                                Email: contact@example.com
                            </Text>
                        </div>
                    </Col>
                    <Col span={12} style={{ textAlign: "right" }}>
                        <Title level={1} style={{ margin: 0, color: "#ff4d4f" }}>
                            HÓA ĐƠN
                        </Title>
                        <Text strong style={{ fontSize: 16 }}>
                            #{order.order_code}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Ngày: {dayjs(order.created_at).format("DD/MM/YYYY")}
                        </Text>
                    </Col>
                </Row>

                <Divider />

                {/* Customer Info */}
                <Row gutter={[24, 16]} style={{ marginBottom: 32 }}>
                    <Col span={12}>
                        <div>
                            <Text strong style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
                                THÔNG TIN KHÁCH HÀNG
                            </Text>
                            <Text strong>Họ tên: </Text>
                            <Text>{order.address.recipient_name}</Text>
                            <br />
                            <Text strong>Điện thoại: </Text>
                            <Text>{order.address.phone}</Text>
                            <br />
                            <Text strong>Địa chỉ: </Text>
                            <Text>
                                {[
                                    order.address.village,
                                    order.address.commune,
                                    order.address.district,
                                    order.address.city,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div>
                            <Text strong style={{ fontSize: 15, display: "block", marginBottom: 8 }}>
                                THÔNG TIN THANH TOÁN
                            </Text>
                            <Text strong>Phương thức: </Text>
                            <Text>{getPaymentMethodText(order.payment_method)}</Text>
                            <br />
                            <Text strong>Trạng thái: </Text>
                            <Text style={{ color: "#52c41a" }}>Đã đặt hàng</Text>
                        </div>
                    </Col>
                </Row>

                {/* Items Table */}
                <Table
                    dataSource={order.items}
                    columns={columns}
                    pagination={false}
                    rowKey="id"
                    bordered
                    style={{ marginBottom: 24 }}
                    summary={() => (
                        <>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                    <Text strong>Tạm tính:</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text strong>{formatCurrency(order.total_amount)}₫</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>

                            {order.discount_amount > 0 && (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={4} align="right">
                                        <Text strong>Giảm giá:</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right">
                                        <Text strong style={{ color: "#52c41a" }}>
                                            -{formatCurrency(order.discount_amount)}₫
                                        </Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            )}

                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                    <Text strong>Phí vận chuyển:</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text strong>
                                        {order.shipping_fee === 0
                                            ? "Miễn phí"
                                            : `${formatCurrency(order.shipping_fee)}₫`}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>

                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={4} align="right">
                                    <Text strong style={{ fontSize: 16 }}>
                                        TỔNG THANH TOÁN:
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text
                                        strong
                                        style={{ fontSize: 18, color: "#ff4d4f" }}
                                    >
                                        {formatCurrency(order.final_amount)}₫
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        </>
                    )}
                />

                {/* Footer */}
                <Divider />

                <Row gutter={[24, 24]}>
                    <Col span={12}>
                        <div style={{ textAlign: "center" }}>
                            <Text strong>Người mua hàng</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                (Ký, ghi rõ họ tên)
                            </Text>
                        </div>
                    </Col>
                    <Col span={12}>
                        <div style={{ textAlign: "center" }}>
                            <Text strong>Người bán hàng</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                (Ký, đóng dấu)
                            </Text>
                        </div>
                    </Col>
                </Row>

                <div style={{ marginTop: 40, textAlign: "center" }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Cảm ơn quý khách đã mua hàng tại cửa hàng chúng tôi!
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Hotline hỗ trợ: 1900-xxxx | Email: support@example.com
                    </Text>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    @page {
                        margin: 0.5cm;
                    }
                }
            `}</style>
        </div>
    );
};

export default InvoicePage;