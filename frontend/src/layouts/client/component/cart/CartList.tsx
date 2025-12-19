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
    InputNumber,
    Card,
    Empty,
    Breadcrumb,
    Divider,
} from "antd";
import {
    MinusOutlined,
    PlusOutlined,
    DeleteOutlined,
    ShoppingCartOutlined,
    HomeOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

// ============= CONSTANTS & UTILITIES =============
const getAuthToken = () =>
    localStorage.getItem("access_token") || localStorage.getItem("token");

const API_URL = "http://127.0.0.1:8000/api";

const toVND = (value: number): string => {
    return new Intl.NumberFormat("vi-VN", { 
        style: "currency", 
        currency: "VND" 
    }).format(value);
};

// ============= INTERFACES =============
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

// ============= COMPONENT =============
const CartList: React.FC = () => {
    const [cart, setCart] = useState<Cart | null>(null);
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
    const [errorTimeouts, setErrorTimeouts] = useState<Record<number, NodeJS.Timeout>>({});
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

    // ✏️ Cập nhật số lượng lên server
    const updateQuantity = async (itemId: number, newQty: number) => {
        if (!cart) return;

        const validQty = Math.floor(newQty);

        const oldCart = JSON.parse(JSON.stringify(cart));
        setCart({
            ...cart,
            items: cart.items.map((i) =>
                i.id === itemId ? { ...i, quantity: validQty } : i
            ),
        });

        try {
            await axios.put(
                `${API_URL}/cart/update/${itemId}`,
                { quantity: validQty },
                { headers: { Authorization: `Bearer ${getAuthToken()}` } }
            );
        } catch {
            setCart(oldCart);
            message.error("Không thể cập nhật số lượng");
        }
    };

    // ========== VALIDATION REALTIME ==========
    const handleQuantityChange = (itemId: number, value: number | null) => {
        if (!cart) return;
        
        const item = cart.items.find((i) => i.id === itemId);
        if (!item) return;

        // Hủy timeout cũ nếu có
        if (errorTimeouts[itemId]) {
            clearTimeout(errorTimeouts[itemId]);
        }

        // Xóa lỗi cũ
        setQuantityErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[itemId];
            return newErrors;
        });

        // Cho phép null/undefined (đang xóa input)
        if (value === null || value === undefined) {
            return;
        }

        // Kiểm tra số âm
        if (value < 0) {
            setQuantityErrors(prev => ({ 
                ...prev, 
                [itemId]: "Số lượng không được là số âm" 
            }));
            
            // Tự động đặt lại về 1 sau 1.5 giây
            const timeout = setTimeout(() => {
                updateQuantity(itemId, 1);
                setQuantityErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[itemId];
                    return newErrors;
                });
                setErrorTimeouts(prev => {
                    const newTimeouts = { ...prev };
                    delete newTimeouts[itemId];
                    return newTimeouts;
                });
            }, 1500);

            setErrorTimeouts(prev => ({ ...prev, [itemId]: timeout }));
            return;
        }

        // Kiểm tra số 0
        if (value === 0) {
            setQuantityErrors(prev => ({ 
                ...prev, 
                [itemId]: "Số lượng phải lớn hơn 0" 
            }));
            
            // Tự động đặt lại về 1 sau 1.5 giây
            const timeout = setTimeout(() => {
                updateQuantity(itemId, 1);
                setQuantityErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[itemId];
                    return newErrors;
                });
                setErrorTimeouts(prev => {
                    const newTimeouts = { ...prev };
                    delete newTimeouts[itemId];
                    return newTimeouts;
                });
            }, 1500);

            setErrorTimeouts(prev => ({ ...prev, [itemId]: timeout }));
            return;
        }

        // Kiểm tra vượt quá stock
        if (value > item.variant.stock_quantity) {
            setQuantityErrors(prev => ({ 
                ...prev, 
                [itemId]: `Số lượng tối đa là ${item.variant.stock_quantity}` 
            }));
            
            // Tự động đặt lại về stock_quantity sau 1.5 giây
            const timeout = setTimeout(() => {
                updateQuantity(itemId, item.variant.stock_quantity);
                setQuantityErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[itemId];
                    return newErrors;
                });
                setErrorTimeouts(prev => {
                    const newTimeouts = { ...prev };
                    delete newTimeouts[itemId];
                    return newTimeouts;
                });
            }, 4000);

            setErrorTimeouts(prev => ({ ...prev, [itemId]: timeout }));
            return;
        }

        // Hợp lệ - cập nhật lên server
        updateQuantity(itemId, value);
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
        
        // Cleanup timeouts khi component unmount
        return () => {
            Object.values(errorTimeouts).forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    // 🧮 Tổng tiền các sản phẩm được chọn
    const total = cart?.items
        .filter((i) => selectedItems.includes(i.id))
        .reduce(
            (sum, i) =>
                sum +
                i.quantity *
                parseFloat(i.variant.discount_price || i.variant.price || "0"),
            0
        ) || 0;

    // ✅ Chọn tất cả
    const handleSelectAll = (checked: boolean) => {
        setSelectedItems(checked ? cart?.items.map((i) => i.id) || [] : []);
    };

    // 🛒 Lưu sản phẩm được chọn để đặt hàng
    const handleBuy = () => {
        if (selectedItems.length === 0) {
            message.warning("Chưa chọn sản phẩm nào để mua");
            return;
        }

        // Kiểm tra tổng đơn hàng
        if (total > 70000000) {
            message.error("Đơn hàng vượt quá 70 triệu đồng. Vui lòng giảm số lượng sản phẩm hoặc chia thành nhiều đơn hàng.");
            return;
        }

        const selectedProducts = cart?.items.filter((item) =>
            selectedItems.includes(item.id)
        ) || [];

        localStorage.setItem("selectedCartItems", JSON.stringify(selectedProducts));
        localStorage.setItem("cartTotal", total.toString());

        navigate("/checkout");
    };

    // ============= RENDER EMPTY STATE =============
    if (!cart || cart.items.length === 0) {
        return (
            <div style={{ background: "#f8f9fa", minHeight: "100vh", paddingBottom: 32 }}>
                {/* Header */}
                <div style={{ background: "#fff", padding: "10px 24px", borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                        <Breadcrumb
                            items={[
                                { href: "/", title: <HomeOutlined style={{ fontSize: 12 }} /> },
                                { title: <span style={{ fontSize: 12 }}>Giỏ hàng</span> },
                            ]}
                        />
                    </div>
                </div>

                <div style={{ padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
                    <Card style={{ borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                        <Empty
                            image={<ShoppingCartOutlined style={{ fontSize: 80, color: "#d1d5db" }} />}
                            description={
                                <div>
                                    <Title level={4} style={{ margin: "16px 0 8px 0", fontSize: 18, color: "#6b7280" }}>
                                        Giỏ hàng trống
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        Hãy thêm sản phẩm vào giỏ hàng của bạn
                                    </Text>
                                </div>
                            }
                        >
                            <Button type="primary" onClick={() => navigate("/products")} style={{ marginTop: 16 }}>
                                Tiếp tục mua sắm
                            </Button>
                        </Empty>
                    </Card>
                </div>
            </div>
        );
    }

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
                        <Text strong style={{ fontSize: 14 }}>{item.variant.product?.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Màu: {item.variant.color?.value} | Size: {item.variant.size?.value}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Còn lại: {item.variant.stock_quantity}
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
                            <Text type="danger" strong style={{ fontSize: 15 }}>
                                {toVND(parseInt(item.variant.discount_price))}
                            </Text>
                            <br />
                            <Text delete type="secondary" style={{ fontSize: 12 }}>
                                {toVND(parseInt(item.variant.price))}
                            </Text>
                        </>
                    ) : (
                        <Text type="danger" strong style={{ fontSize: 15 }}>
                            {toVND(parseInt(item.variant.price))}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: "Số lượng",
            render: (item: CartItem) => (
                <div>
                    <Space size={8}>
                        <Button
                            size="middle"
                            icon={<MinusOutlined />}
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            style={{ width: 36, height: 36 }}
                        />
                        <InputNumber
                            value={item.quantity}
                            onChange={(value) => handleQuantityChange(item.id, value)}
                            onKeyDown={(e) => {
                                // Chỉ cho phép: số 0-9, dấu trừ, Backspace, Delete, Tab, Arrow keys, Enter
                                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'];
                                const isNumber = /^[0-9]$/.test(e.key);
                                const isMinus = e.key === '-';
                                
                                if (!isNumber && !isMinus && !allowedKeys.includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={(e) => {
                                const pastedText = e.clipboardData.getData('text');
                                // Cho phép paste cả số âm
                                if (!/^-?\d+$/.test(pastedText)) {
                                    e.preventDefault();
                                    message.warning('Chỉ được nhập số');
                                }
                            }}
                            controls={false}
                            status={quantityErrors[item.id] ? "error" : ""}
                            style={{ width: 70, height: 36, textAlign: "center" }}
                        />
                        <Button
                            size="middle"
                            icon={<PlusOutlined />}
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.variant.stock_quantity}
                            style={{ width: 36, height: 36 }}
                        />
                    </Space>
                    {quantityErrors[item.id] && (
                        <Text type="danger" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                            {quantityErrors[item.id]}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: "Thành tiền",
            render: (item: CartItem) => {
                const price = parseFloat(
                    item.variant.discount_price || item.variant.price
                );
                return (
                    <Text strong type="danger" style={{ fontSize: 15 }}>
                        {toVND(price * item.quantity)}
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

    // ============= MAIN RENDER =============
    return (
        <div style={{ background: "#f8f9fa", minHeight: "100vh", paddingBottom: 32 }}>
            {/* Header */}
            <div style={{ background: "#fff", padding: "10px 24px", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <Breadcrumb
                        items={[
                            { href: "/", title: <HomeOutlined style={{ fontSize: 12 }} /> },
                            { title: <span style={{ fontSize: 12 }}>Giỏ hàng</span> },
                        ]}
                    />
                </div>
            </div>

            <div style={{ padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
                <Card 
                    style={{ borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                    styles={{ body: { padding: 16 } }}
                >
                    <Title level={3} style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700 }}>
                        🛍️ Giỏ hàng của bạn
                    </Title>

                    <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ fontSize: 13 }}>
                            Đã chọn {selectedItems.length} sản phẩm
                        </Text>
                    </div>

                    <Table
                        dataSource={cart.items}
                        columns={columns}
                        pagination={false}
                        rowKey="id"
                        loading={loading}
                    />

                    <Divider style={{ margin: "16px 0" }} />

                    {/* Tổng tiền + mua hàng */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

                        <Space size="large">
                            <div>
                                <Text style={{ fontSize: 13 }}>Tổng cộng: </Text>
                                <Text type="danger" strong style={{ fontSize: 22, fontWeight: 700 }}>
                                    {toVND(total)}
                                </Text>
                                {total > 70000000 && (
                                    <div style={{ marginTop: 4 }}>
                                        <Text type="danger" style={{ fontSize: 12 }}>
                                            Đơn hàng vượt quá 70 triệu đồng
                                        </Text>
                                    </div>
                                )}
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                disabled={selectedItems.length === 0 || total > 70000000}
                                onClick={handleBuy}
                                style={{
                                    height: 42,
                                    fontSize: 14,
                                    fontWeight: "600",
                                    borderRadius: 6,
                                    minWidth: 140,
                                }}
                            >
                                Mua hàng
                            </Button>
                        </Space>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default CartList;