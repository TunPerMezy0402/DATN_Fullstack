import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Table,
    Button,
    Image,
    Space,
    Popconfirm,
    message,
    Typography,
    Checkbox,
} from "antd";
import {
    MinusOutlined,
    PlusOutlined,
    DeleteOutlined,
} from "@ant-design/icons";


const { Text, Title } = Typography;

const getAuthToken = () =>
    localStorage.getItem("access_token") || localStorage.getItem("token");

const API_URL = "http://127.0.0.1:8000/api";

interface Color {
    type: string;
    value: string;
}

interface Size {
    type: string;
    value: string;
}

interface Product {
    id: number;
    name: string;
}
interface Variant {
    id: number;
    sku: string;
    image: string;
    price: string;
    discount_price: string | null;
    stock_quantity: number;
    product: Product;
    color: Color;
    size: Size;
}
interface CartItem {
    id: number;
    quantity: number;
    variant: Variant;
}
interface Cart {
    id: number;
    items: CartItem[];
}

const CartList: React.FC = () => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    // 🧭 Lấy dữ liệu giỏ hàng
    const fetchCart = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/cart`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            setCart(res.data);
        } catch {
            message.error("Không thể tải giỏ hàng");
        } finally {
            setLoading(false);
        }
    };

    // ✏️ Cập nhật số lượng
    const updateQuantity = async (itemId: number, newQty: number) => {
        if (!cart) return;
        if (newQty < 1) return message.warning("Số lượng tối thiểu là 1");

        const oldCart = JSON.parse(JSON.stringify(cart));
        setCart({
            ...cart,
            items: cart.items.map((i) =>
                i.id === itemId ? { ...i, quantity: newQty } : i
            ),
        });

        try {
            await axios.put(
                `${API_URL}/cart/update/${itemId}`,
                { quantity: newQty },
                { headers: { Authorization: `Bearer ${getAuthToken()}` } }
            );
        } catch {
            setCart(oldCart);
            message.error("Không thể cập nhật số lượng");
        }
    };

    // ❌ Xóa 1 sản phẩm
    const removeItem = async (itemId: number) => {
        try {
            await axios.delete(`${API_URL}/cart/remove/${itemId}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            setCart((prev) =>
                prev
                    ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) }
                    : prev
            );
            message.success("Đã xóa sản phẩm");
        } catch {
            message.error("Xóa thất bại");
        }
    };

    // ❌ Xóa nhiều sản phẩm
    const removeSelected = async () => {
        if (selectedItems.length === 0)
            return message.warning("Chưa chọn sản phẩm nào");

        const oldCart = JSON.parse(JSON.stringify(cart));
        setCart((prev) =>
            prev
                ? {
                    ...prev,
                    items: prev.items.filter((i) => !selectedItems.includes(i.id)),
                }
                : prev
        );
        setSelectedItems([]);

        try {
            await Promise.all(
                selectedItems.map((id) =>
                    axios.delete(`${API_URL}/cart/remove/${id}`, {
                        headers: { Authorization: `Bearer ${getAuthToken()}` },
                    })
                )
            );
            message.success("Đã xóa sản phẩm đã chọn");
        } catch {
            setCart(oldCart);
            message.error("Không thể xóa một số sản phẩm");
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);


    if (!cart || cart.items.length === 0)
        return (
            <div className="p-10 text-center">
                <Title level={4}>🛒 Giỏ hàng trống</Title>
                <Text type="secondary">Hãy thêm sản phẩm vào giỏ hàng của bạn</Text>
            </div>
        );

    // 🧮 Tổng tiền các sản phẩm được chọn
    const total = cart.items
        .filter((i) => selectedItems.includes(i.id))
        .reduce(
            (sum, i) =>
                sum +
                i.quantity *
                parseFloat(i.variant.discount_price || i.variant.price || "0"),
            0
        );

    // ✅ Chọn tất cả
    const handleSelectAll = (checked: boolean) => {
        setSelectedItems(checked ? cart.items.map((i) => i.id) : []);
    };
    // 🛒 Lưu sản phẩm được chọn để đặt hàng
    const handleBuy = () => {
        if (selectedItems.length === 0) {
            message.warning("Chưa chọn sản phẩm nào để mua");
            return;
        }

        // Lấy danh sách sản phẩm được chọn
        const selectedProducts = cart.items.filter((item) =>
            selectedItems.includes(item.id)
        );

        // ✅ Lưu dữ liệu sang localStorage
        localStorage.setItem("selectedCartItems", JSON.stringify(selectedProducts));

        // ✅ Tính tổng tiền
        const total = selectedProducts.reduce(
            (sum, i) =>
                sum +
                i.quantity *
                parseFloat(i.variant.discount_price || i.variant.price || "0"),
            0
        );
        localStorage.setItem("cartTotal", total.toString());

        // 🔄 Chuyển sang trang thanh toán
        navigate("/checkout");
    };

    // 🧾 Cấu hình cột bảng
    const columns = [
        {
            title: "",
            render: (item: CartItem) => (
                <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) =>
                        setSelectedItems((prev) =>
                            e.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id)
                        )
                    }
                />
            ),
            width: 60,
        },
        {
            title: "Sản phẩm",
            render: (item: CartItem) => (
                <Space>
                    <Image
                        src={`http://127.0.0.1:8000/${item.variant.image}`}
                        alt={item.variant.product?.name}
                        width={70}
                        height={70}
                        style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                    <div>
                        <Text strong>{item.variant.product?.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            Màu: {item.variant.color?.value} | Size: {item.variant.size?.value}
                        </Text>

                    </div>
                </Space>
            ),
        },
        {
            title: "Giá",
            render: (item: CartItem) => (
                <div>
                    {item.variant.discount_price ? (
                        <>
                            <Text type="danger" strong>
                                {parseInt(item.variant.discount_price).toLocaleString()}₫
                            </Text>
                            <br />
                            <Text delete type="secondary">
                                {parseInt(item.variant.price).toLocaleString()}₫
                            </Text>
                        </>
                    ) : (
                        <Text type="danger" strong>
                            {parseInt(item.variant.price).toLocaleString()}₫
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: "Số lượng",
            render: (item: CartItem) => (
                <Space>
                    <Button
                        icon={<MinusOutlined />}
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                    />
                    <span style={{ minWidth: 30, textAlign: "center" }}>
                        {item.quantity}
                    </span>
                    <Button
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.variant.stock_quantity}
                    />
                </Space>
            ),
        },
        {
            title: "Thành tiền",
            render: (item: CartItem) => {
                const price = parseFloat(
                    item.variant.discount_price || item.variant.price
                );
                return (
                    <Text strong type="danger">
                        {(price * item.quantity).toLocaleString()}₫
                    </Text>
                );
            },
        },
        {
            title: "Thao tác",
            render: (item: CartItem) => (
                <Popconfirm
                    title="Bạn có chắc muốn xóa sản phẩm này?"
                    onConfirm={() => removeItem(item.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                >
                    <Button danger type="link" icon={<DeleteOutlined />}>
                        Xóa
                    </Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white rounded shadow">
            <Title level={3}>🛍️ Giỏ hàng của bạn</Title>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                }}
            >
                <Text strong>Đã chọn {selectedItems.length} sản phẩm</Text>
            </div>

            <Table
                dataSource={cart.items}
                columns={columns}
                pagination={false}
                rowKey="id"
                loading={loading}
            />

            {/* Tổng tiền + mua hàng */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 20,
                    borderTop: "1px solid #eee",
                    paddingTop: 20,
                }}
            >
                <Space>
                    <Checkbox
                        checked={selectedItems.length === cart.items.length}
                        indeterminate={
                            selectedItems.length > 0 &&
                            selectedItems.length < cart.items.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                    >
                        Chọn tất cả
                    </Checkbox>

                    <Popconfirm
                        title="Xóa các sản phẩm đã chọn?"
                        onConfirm={removeSelected}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            disabled={selectedItems.length === 0}
                        >
                            Xóa sản phẩm đã chọn
                        </Button>
                    </Popconfirm>
                </Space>

                <Space>
                    <Text strong>Tổng cộng: </Text>
                    <Text type="danger" strong style={{ fontSize: 18 }}>
                        {total.toLocaleString()}₫
                    </Text>
                    <Button
                        type="primary"
                        disabled={selectedItems.length === 0}
                        onClick={handleBuy}
                    >
                        Mua hàng
                    </Button>
                </Space>
            </div>
        </div>
    );
};

export default CartList;
