import React, { useEffect, useMemo, useState } from "react";
import {
    Steps,
    Form,
    Input,
    Button,
    Select,
    Radio,
    Typography,
    Divider,
    message,
    Card,
    Space,
    Spin,
    Image,
    Table,
    Row,
    Col,
    Modal,
    List,
    Tag,
} from "antd";
import { GiftOutlined } from "@ant-design/icons";
import axios from "axios";
import { getProvinces, getDistricts, getWards } from "vietnam-provinces";

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

const API_URL = "http://127.0.0.1:8000/api";
const getAuthToken = () =>
    localStorage.getItem("access_token") || localStorage.getItem("token");

// ---------- Types ----------
type Attr = { id?: number; type?: string; name?: string; value?: string };
type Product = { id?: number; name?: string; image?: string };
type Variant = {
    id?: number;
    image?: string;
    product?: Product;
    price?: string | number;
    discount_price?: string | number | null;
    stock_quantity?: number;
    color?: Attr;
    size?: Attr;
};
type CartItem = {
    id?: number;
    quantity: number;
    variant: Variant;
};

type Address = {
    id: number;
    recipient_name: string;
    phone: string;
    village?: string;
    commune?: string;
    district?: string;
    city?: string;
    is_default?: boolean;
};

type Coupon = {
    id: number;
    code: string;
    type: "percent" | "fixed";
    value: number;
    description?: string;
    expired_at?: string | null;
};

// ---------- Helpers ----------
const formatCurrency = (value: any): string => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString("vi-VN");
};

const getFullAddressName = (addr?: any) => {
    if (!addr) return "";
    const province = getProvinces().find((p) => p.code === addr.city);
    const district = getDistricts(addr.city).find((d) => d.code === addr.district);
    const ward = getWards(addr.district).find((w) => w.code === addr.commune);

    return [
        addr.village,
        ward ? ward.name : addr.commune,
        district ? district.name : addr.district,
        province ? province.name : addr.city,
    ]
        .filter(Boolean)
        .join(", ");
};

// Helper để format giá trị giảm giá
const formatDiscountValue = (coupon: Coupon): string => {
    if (coupon.type === "percent") {
        return `Giảm ${coupon.value}%`;
    } else {
        return `Giảm ${formatCurrency(coupon.value)}₫`;
    }
};

// ---------- Component ----------
const CheckoutPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [form] = Form.useForm();
    const [paymentForm] = Form.useForm();
    const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [user, setUser] = useState<any>(null);

    // voucher / coupon
    const [voucherCode, setVoucherCode] = useState<string>("");
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponList, setCouponList] = useState<Coupon[]>([]);
    const [couponModal, setCouponModal] = useState<boolean>(false);

    // payment
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // load cart from localStorage
    useEffect(() => {
        const items = JSON.parse(localStorage.getItem("selectedCartItems") || "[]") as CartItem[];
        const normalized = items.map((it) => ({
            ...it,
            variant: it.variant || {},
            quantity: it.quantity || 1,
        }));
        setSelectedItems(normalized);
    }, []);

    // fetch profile + addresses
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/profile`, {
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                });
                const data = res.data || {};
                setUser(data.user || data);
                setAddresses(data.addresses || []);
                const defaultAddr = (data.addresses || []).find((a: Address) => a.is_default);
                if (defaultAddr) setSelectedAddress(defaultAddr);
            } catch (err) {
                console.error(err);
                message.error("Không thể tải thông tin người dùng / địa chỉ");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // fetch coupon list
    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const res = await axios.get(`${API_URL}/admin/coupons`, {
                    headers: { Authorization: `Bearer ${getAuthToken()}` },
                });
                setCouponList(res.data?.data || res.data || []);
            } catch {
                console.log("Không thể tải mã giảm giá");
            }
        };
        fetchCoupons();
    }, []);

    // ---------- price calculations ----------
    const subtotal = useMemo(() => {
        return selectedItems.reduce((s, it) => {
            const price = parseFloat(String(it.variant.discount_price ?? it.variant.price ?? 0)) || 0;
            return s + price * it.quantity;
        }, 0);
    }, [selectedItems]);

    const shippingFee = useMemo(() => (subtotal >= 500000 ? 0 : 30000), [subtotal]);

    const voucherDiscount = useMemo(() => {
        if (!appliedCoupon) return 0;
        const now = new Date();
        if (appliedCoupon.expired_at && new Date(appliedCoupon.expired_at) < now) {
            message.warning("Mã giảm giá đã hết hạn!");
            return 0;
        }
        if (appliedCoupon.type === "percent") {
            return Math.round((appliedCoupon.value / 100) * subtotal);
        } else {
            return appliedCoupon.value;
        }
    }, [appliedCoupon, subtotal]);

    const total = Math.max(0, subtotal - voucherDiscount + shippingFee);

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setVoucherCode("");
        message.info("Đã bỏ mã giảm giá");
    };

    // ---------- submit order ----------
    const submitOrder = async (values: any) => {
        if (!selectedAddress) {
            message.warning("Vui lòng chọn địa chỉ nhận hàng");
            setCurrentStep(0);
            return;
        }
        const paymentMethod = values.payment || selectedPayment;
        if (!paymentMethod) {
            message.warning("Vui lòng chọn phương thức thanh toán");
            return;
        }

        const payload = {
            items: selectedItems.map((it) => ({
                variant_id: it.variant.id,
                quantity: it.quantity,
            })),
            address_id: selectedAddress.id,
            payment_method: paymentMethod,
            note: values.note || "",
            voucher_code: appliedCoupon?.code ?? null,
        };

        try {
            setIsPlacingOrder(true);
            await axios.post(`${API_URL}/orders`, payload, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            message.success("Đặt hàng thành công!");
            localStorage.removeItem("selectedCartItems");
            setTimeout(() => (window.location.href = "/orders"), 1000);
        } catch (err) {
            console.error(err);
            message.error("Đặt hàng thất bại — thử lại sau");
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // ---------- UI ----------
    if (loading)
        return (
            <div className="flex justify-center items-center h-96">
                <Spin size="large" />
            </div>
        );

    return (
        <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">
            <Title level={3} style={{ textAlign: "center" }}>
                Thanh toán
            </Title>

            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Step title="Thông tin" />
                <Step title="Thanh toán" />
            </Steps>

            {/* ====================== STEP 1: THÔNG TIN ====================== */}
            {currentStep === 0 && (
                <Form layout="vertical" form={form} onFinish={() => setCurrentStep(1)}>
                    <Card title="THÔNG TIN ĐƠN HÀNG" style={{ marginBottom: 20 }}>
                        <Table
                            dataSource={selectedItems}
                            rowKey={(r) => String(r.id ?? Math.random())}
                            pagination={false}
                            size="small"
                        >
                            <Table.Column
                                title="Sản phẩm"
                                render={(_, record: CartItem) => {
                                    const v = record.variant || {};
                                    const p = v.product || {};
                                    return (
                                        <Space align="center">
                                            <Image
                                                src={v.image ? `http://127.0.0.1:8000/${v.image}` : ""}
                                                width={60}
                                                height={60}
                                                preview={false}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{p.name}</div>
                                                <Text type="secondary">
                                                    Màu: {v.color?.value || "-"} | Size: {v.size?.value || "-"}
                                                </Text>
                                            </div>
                                        </Space>
                                    );
                                }}
                            />
                            <Table.Column
                                title="Giá"
                                render={(_, record: CartItem) => {
                                    const v = record.variant || {};
                                    const price = parseFloat(String(v.discount_price ?? v.price ?? 0)) || 0;
                                    return <Text strong>{formatCurrency(price)}₫</Text>;
                                }}
                            />
                            <Table.Column title="Số lượng" render={(_, r) => r.quantity} />
                            <Table.Column
                                title="Thành tiền"
                                render={(_, r) => {
                                    const price = parseFloat(String(r.variant.discount_price ?? r.variant.price ?? 0));
                                    return <Text strong>{formatCurrency(price * r.quantity)}₫</Text>;
                                }}
                            />
                        </Table>
                        <Divider />
                        <div style={{ textAlign: "right" }}>
                            <Text strong style={{ fontSize: 16 }}>
                                Tổng cộng: {formatCurrency(subtotal)}₫
                            </Text>
                        </div>
                    </Card>

                    <Card title="ĐỊA CHỈ NHẬN HÀNG">
                        {addresses.length > 0 ? (
                            <Radio.Group
                                value={selectedAddress?.id}
                                onChange={(e) =>
                                    setSelectedAddress(addresses.find((a) => a.id === e.target.value) ?? null)
                                }
                            >
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {addresses.map((addr) => (
                                        <Card
                                            key={addr.id}
                                            size="small"
                                            style={{
                                                border:
                                                    selectedAddress?.id === addr.id
                                                        ? "2px solid #1890ff"
                                                        : "1px solid #ddd",
                                                borderRadius: 8,
                                            }}
                                        >
                                            <Radio value={addr.id}>
                                                <Text strong>
                                                    {addr.recipient_name} ({addr.phone})
                                                </Text>
                                                <br />
                                                <Text type="secondary">{getFullAddressName(addr)}</Text>
                                            </Radio>
                                        </Card>
                                    ))}
                                </Space>
                            </Radio.Group>
                        ) : (
                            <Text>Không có địa chỉ nào</Text>
                        )}
                    </Card>

                    <div style={{ textAlign: "right", marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" disabled={!selectedAddress}>
                            Tiếp tục
                        </Button>
                    </div>
                </Form>
            )}

            {/* ====================== STEP 2: THANH TOÁN ====================== */}
            {currentStep === 1 && (
                <Row gutter={16}>
                    <Col xs={24} md={14}>
                        <Card title="TÓM TẮT ĐƠN HÀNG" style={{ marginBottom: 16 }}>
                            {selectedItems.map((it) => {
                                const v = it.variant || {};
                                const p = v.product || {};
                                return (
                                    <div
                                        key={it.id}
                                        style={{
                                            display: "flex",
                                            gap: 12,
                                            marginBottom: 12,
                                            borderBottom: "1px solid #f0f0f0",
                                            paddingBottom: 8,
                                        }}
                                    >
                                        <img
                                            src={v.image ? `http://127.0.0.1:8000/${v.image}` : ""}
                                            width={72}
                                            height={72}
                                            alt=""
                                            style={{ borderRadius: 6 }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <Text strong>{p.name}</Text>
                                            <br />
                                            <Text type="secondary">
                                                Màu: {v.color?.value || "-"} | Size: {v.size?.value || "-"}
                                            </Text>
                                            <br />
                                            <Text>Số lượng: {it.quantity}</Text>
                                        </div>
                                        <Text strong>
                                            {formatCurrency(
                                                parseFloat(String(v.discount_price ?? v.price ?? 0)) * it.quantity
                                            )}
                                            ₫
                                        </Text>
                                    </div>
                                );
                            })}
                            <Divider />
                            {/* Coupon */}
                            <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
                                <Input
                                    placeholder="Nhập mã giảm giá"
                                    value={voucherCode}
                                    onChange={(e) => setVoucherCode(e.target.value)}
                                />
                                <Button icon={<GiftOutlined />} onClick={() => setCouponModal(true)}>
                                    Chọn mã
                                </Button>
                            </Space.Compact>

                            {appliedCoupon && (
                                <Tag 
                                    color="green" 
                                    closable 
                                    onClose={removeCoupon}
                                    style={{ fontSize: 14, padding: '4px 12px' }}
                                >
                                    <GiftOutlined style={{ marginRight: 4 }} />
                                    {formatDiscountValue(appliedCoupon)}
                                </Tag>
                            )}

                            <Divider />
                            <div className="flex justify-between">
                                <span>Tạm tính:</span>
                                <Text>{formatCurrency(subtotal)}₫</Text>
                            </div>
                            <div className="flex justify-between">
                                <span>Giảm giá:</span>
                                <Text type="danger">- {formatCurrency(voucherDiscount)}₫</Text>
                            </div>
                            <div className="flex justify-between">
                                <span>Phí vận chuyển:</span>
                                <Text>{shippingFee === 0 ? "Miễn phí" : `${formatCurrency(shippingFee)}₫`}</Text>
                            </div>
                            <Divider />
                            <div className="flex justify-between" style={{ fontWeight: 600, fontSize: 16 }}>
                                <span>Tổng cộng:</span>
                                <Text style={{ color: "#ff4d4f" }}>{formatCurrency(total)}₫</Text>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} md={10}>
                        <Card title="THÔNG TIN GIAO HÀNG">
                            <Text strong>{selectedAddress?.recipient_name}</Text>
                            <br />
                            <Text>{selectedAddress?.phone}</Text>
                            <br />
                            <Text>{getFullAddressName(selectedAddress ?? undefined)}</Text>
                        </Card>
                        <Card title="PHƯƠNG THỨC THANH TOÁN">
                            <Form layout="vertical" form={paymentForm} onFinish={submitOrder}>
                                <Form.Item name="payment" label="Chọn phương thức thanh toán">
                                    <Radio.Group
                                        onChange={(e) => setSelectedPayment(e.target.value)}
                                        value={selectedPayment}
                                    >
                                        <Space direction="vertical">
                                            <Radio value="cod">Thanh toán khi nhận hàng (COD)</Radio>
                                            <Radio value="vnpay">VNPay</Radio>
                                        </Space>
                                    </Radio.Group>
                                </Form.Item>

                                <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
                                    <Input.TextArea rows={2} placeholder="Thêm ghi chú nếu cần" />
                                </Form.Item>

                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={isPlacingOrder}
                                        disabled={!selectedPayment}
                                    >
                                        Đặt hàng
                                    </Button>
                                </div>
                            </Form>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* ====================== MODAL CHỌN MÃ ====================== */}
            <Modal
                title="Chọn mã giảm giá"
                open={couponModal}
                onCancel={() => setCouponModal(false)}
                footer={null}
            >
                <List
                    dataSource={couponList}
                    renderItem={(coupon) => {
                        const expired = coupon.expired_at
                            ? new Date(coupon.expired_at) < new Date()
                            : false;

                        return (
                            <List.Item
                                actions={[
                                    <Button
                                        type="link"
                                        disabled={expired}
                                        onClick={() => {
                                            setAppliedCoupon(coupon);
                                            setVoucherCode(coupon.code);
                                            setCouponModal(false);
                                            message.success(`Đã áp dụng ${formatDiscountValue(coupon)}`);
                                        }}
                                    >
                                        Áp dụng
                                    </Button>,
                                ]}
                            >
                                <List.Item.Meta
                                    avatar={<GiftOutlined style={{ fontSize: 24, color: "#faad14" }} />}
                                    title={
                                        <div>
                                            <Text strong style={{ fontSize: 16 }}>
                                                {formatDiscountValue(coupon)}
                                            </Text>
                                            {expired && (
                                                <Tag color="red" style={{ marginLeft: 8 }}>
                                                    Hết hạn
                                                </Tag>
                                            )}
                                        </div>
                                    }
                                    description={
                                        <>
                                            <div>{coupon.description || "Không có mô tả"}</div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Mã: {coupon.code}
                                            </Text>
                                        </>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </Modal>
        </div>
    );
};

export default CheckoutPage;