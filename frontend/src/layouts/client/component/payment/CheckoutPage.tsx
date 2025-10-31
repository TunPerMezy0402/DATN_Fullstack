import React, { useState, useEffect } from "react";
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
} from "antd";

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

const CheckoutPage: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [form] = Form.useForm();
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [total, setTotal] = useState<number>(0);

    // 🧾 Lấy dữ liệu từ localStorage (được lưu ở trang giỏ hàng)
    useEffect(() => {
        const items = JSON.parse(localStorage.getItem("selectedCartItems") || "[]");
        const totalPrice = parseFloat(localStorage.getItem("cartTotal") || "0");
        setSelectedItems(items);
        setTotal(totalPrice);
        console.log("✅ Dữ liệu giỏ hàng:", items);
        console.log("💰 Tổng tiền:", totalPrice.toLocaleString(), "₫");
    }, []);

    // ✅ Chuyển bước
    const next = () => setCurrentStep((prev) => prev + 1);
    const prev = () => setCurrentStep((prev) => prev - 1);

    // 🧾 Gửi đơn hàng (demo)
    const handleSubmit = (values: any) => {
        console.log("📦 Thông tin đơn hàng:", values);
        console.log("🛒 Sản phẩm đặt mua:", selectedItems);
        message.success("Đặt hàng thành công!");
    };

    return (
        <div className="max-w-5xl mx-auto bg-white p-6 rounded shadow">
            <Title level={3} style={{ textAlign: "center" }}>
                Thanh toán
            </Title>

            {/* 🪜 Bước tiến trình */}
            <Steps current={currentStep} style={{ marginBottom: 40 }}>
                <Step title="Thông tin" />
                <Step title="Thanh toán" />
            </Steps>

            {/* --- Bước 1: Thông tin --- */}
            {currentStep === 0 && (
                <Form
                    layout="vertical"
                    form={form}
                    onFinish={next}
                    initialValues={{
                        delivery: "home",
                    }}
                >
                    <Card title="THÔNG TIN KHÁCH HÀNG" style={{ marginBottom: 20 }}>
                        <Form.Item
                            label="Họ và tên"
                            name="name"
                            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
                        >
                            <Input placeholder="Nhập họ tên" />
                        </Form.Item>

                        <Form.Item
                            label="Số điện thoại"
                            name="phone"
                            rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }]}
                        >
                            <Input placeholder="Nhập số điện thoại" />
                        </Form.Item>

                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[{ type: "email", message: "Email không hợp lệ" }]}
                        >
                            <Input placeholder="Nhập email" />
                        </Form.Item>
                    </Card>

                    <Card title="THÔNG TIN NHẬN HÀNG">
                        <Form.Item name="delivery" label="Hình thức nhận hàng">
                            <Radio.Group>
                                <Radio value="store">Nhận tại cửa hàng</Radio>
                                <Radio value="home">Giao hàng tận nơi</Radio>
                            </Radio.Group>
                        </Form.Item>

                        <Form.Item
                            label="Địa chỉ nhận hàng"
                            name="address"
                            rules={[{ required: true, message: "Vui lòng nhập địa chỉ" }]}
                        >
                            <Input.TextArea rows={2} placeholder="Ví dụ: Thôn Hạc Sơn, Xã Cẩm Bình, Huyện Cẩm Thủy, Thanh Hóa" />
                        </Form.Item>

                        <Form.Item label="Ghi chú" name="note">
                            <Input.TextArea rows={2} placeholder="Ghi chú thêm (nếu có)" />
                        </Form.Item>
                    </Card>

                    <div style={{ textAlign: "right", marginTop: 20 }}>
                        <Button type="primary" htmlType="submit">
                            Tiếp tục
                        </Button>
                    </div>
                </Form>
            )}

            {/* --- Bước 2: Thanh toán --- */}
            {currentStep === 1 && (
                <>
                    <Card title="TÓM TẮT ĐƠN HÀNG" style={{ marginBottom: 20 }}>
                        {selectedItems.length > 0 ? (
                            selectedItems.map((item) => (
                                <div key={item.id} style={{ marginBottom: 12 }}>
                                    <Space align="start">
                                        <img
                                            src={`http://127.0.0.1:8000/${item.variant.image}`}
                                            alt={item.variant.product.name}
                                            width={70}
                                            height={70}
                                            style={{ borderRadius: 8, objectFit: "cover" }}
                                        />
                                        <div>
                                            <Text strong>{item.variant.product.name}</Text>
                                            <br />
                                            <Text type="secondary">
                                                Màu: {item.variant.color.type} | Size: {item.variant.size.type}
                                            </Text>
                                            <br />
                                            <Text>
                                                Số lượng: <strong>{item.quantity}</strong>
                                            </Text>
                                        </div>
                                    </Space>
                                    <Divider />
                                </div>
                            ))
                        ) : (
                            <Text type="secondary">Không có sản phẩm nào được chọn.</Text>
                        )}

                        <div style={{ textAlign: "right" }}>
                            <Text strong style={{ fontSize: 16 }}>
                                Tổng cộng:{" "}
                                <Text type="danger" style={{ fontSize: 18 }}>
                                    {total.toLocaleString()}₫
                                </Text>
                            </Text>
                        </div>
                    </Card>

                    <Card title="THÔNG TIN THANH TOÁN">
                        <Form onFinish={handleSubmit} layout="vertical">
                            <Form.Item
                                label="Phương thức thanh toán"
                                name="payment"
                                rules={[{ required: true, message: "Vui lòng chọn phương thức thanh toán" }]}
                            >
                                <Select placeholder="Chọn phương thức">
                                    <Option value="cod">Thanh toán khi nhận hàng (COD)</Option>
                                    <Option value="bank">Chuyển khoản ngân hàng</Option>
                                    <Option value="momo">Ví MoMo</Option>
                                </Select>
                            </Form.Item>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginTop: 20,
                                }}
                            >
                                <Button onClick={prev}>Quay lại</Button>
                                <Button type="primary" htmlType="submit">
                                    Đặt hàng
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </>
            )}
        </div>
    );
};

export default CheckoutPage;
