// src/layouts/client/component/ProductDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    Row,
    Col,
    Card,
    Typography,
    Image,
    Tag,
    Divider,
    Space,
    Radio,
    InputNumber,
    Button,
    Alert,
    Skeleton,
    Breadcrumb,
} from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { Link, useParams } from "react-router-dom";
import { fetchClientProduct, toAssetUrl, parseImages } from "../../../api/productApi"; // Giả định các hàm API này đã tồn tại

const { Title, Text, Paragraph } = Typography;

/* --------------------- Helper --------------------- */
const vnd = (x?: number | string | null) =>
    x != null
        ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(x))
        : "—";

const unique = <T,>(arr: T[]) => Array.from(new Set(arr));
const isStr = (x: any): x is string => typeof x === "string" && x.trim() !== "";

/* ===================================================== */
const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [product, setProduct] = useState<any>(null);

    const [selectedVariant, setSelectedVariant] = useState<any>(null);
    const [selectedSize, setSelectedSize] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [qty, setQty] = useState(1);

    /* ---------- Gọi API ---------- */
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetchClientProduct(Number(id));
                if (res && res.product) {
                    const prod = res.product;
                    setProduct(prod);
                    if (Array.isArray(prod.variants) && prod.variants.length > 0) {
                        const first = prod.variants[0];
                        setSelectedVariant(first);
                        setSelectedSize(first.size?.value ?? null);
                        setSelectedColor(first.color?.value ?? null);
                    }
                } else {
                    setError("Không tìm thấy sản phẩm.");
                }
            } catch (err) {
                console.error(err);
                setError("Lỗi khi tải sản phẩm.");
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    /* ---------- Khi thay đổi size/color → tìm biến thể khớp ---------- */
    useEffect(() => {
        if (!product || !product.variants) return;
        const match = product.variants.find(
            (v: any) =>
                (!selectedSize || v.size?.value === selectedSize) &&
                (!selectedColor || v.color?.value === selectedColor)
        );
        setSelectedVariant(match ?? null);
    }, [selectedSize, selectedColor, product]);

    /* ---------- Album ảnh: tổng hợp mọi ảnh (product + variants) ---------- */
    const album: string[] = useMemo(() => {
        if (!product) return [];

        const productCover = toAssetUrl(product.image_url || product.image);
        const productImages = parseImages(product.images); // luôn trả string[]

        const variantSingles =
            product.variants?.map((v: any) => toAssetUrl(v?.image)).filter(isStr) ?? [];
        const variantAlbums =
            product.variants
                ?.flatMap((v: any) => parseImages(v?.images))
                .filter(isStr) ?? [];

        const all = [
            ...(productCover ? [productCover] : []),
            ...productImages,
            ...variantSingles,
            ...variantAlbums,
        ];

        return unique(all);
    }, [product]);

    /* ---------- Ảnh ưu tiên theo biến thể chọn ---------- */
    // Tìm ảnh “tốt nhất” cho biến thể (image hoặc images[0])
    const firstVariantImage = (v?: any): string | null => {
        if (!v) return null;
        const single = toAssetUrl(v.image);
        if (isStr(single)) return single;
        const arr = parseImages(v.images);
        return arr.length ? arr[0] : null;
    };

    // Cập nhật ảnh khi đổi biến thể (chỉ tự set nếu user chưa tự chọn thumbnail)
    useEffect(() => {
        if (!product) return;
        const vImg = firstVariantImage(selectedVariant || undefined);
        if (vImg) {
            setSelectedImage(vImg);
        } else {
            const fallback = toAssetUrl(product.image_url || product.image) || album[0] || null;
            setSelectedImage(fallback);
        }
    }, [selectedVariant, product, album]);

    // Ảnh cover thực tế (ưu tiên selectedImage)
    const coverUrl = selectedImage ?? album[0] ?? toAssetUrl(product?.image_url || product?.image) ?? undefined;

    /* ---------- Giá / Tồn ---------- */
    const salePrice =
        selectedVariant?.discount_price &&
            Number(selectedVariant?.discount_price) < Number(selectedVariant?.price)
            ? selectedVariant.discount_price
            : selectedVariant?.price ?? product?.price;

    const basePrice = selectedVariant?.price ?? product?.price;
    const discountPercent =
        basePrice && salePrice && Number(basePrice) > Number(salePrice)
            ? Math.round(((Number(basePrice) - Number(salePrice)) / Number(basePrice)) * 100)
            : null;

    const stock = (selectedVariant?.stock_quantity ?? product?.stock_quantity ?? 0) as number;
    const inStock = stock > 0;

    /* ---------- Danh sách Size/Color ---------- */
    const sizes: string[] = useMemo(
        () =>
            Array.from(
                new Set(
                    (product?.variants || [])
                        .map((v: any) => v.size?.value)
                        .filter((v: any): v is string => Boolean(v))
                )
            ),
        [product]
    );

    const colors: string[] = useMemo(
        () =>
            Array.from(
                new Set(
                    (product?.variants || [])
                        .map((v: any) => v.color?.value)
                        .filter((v: any): v is string => Boolean(v))
                )
            ),
        [product]
    );

    /* ---------- Render UI ---------- */
    if (loading)
        return (
            <div style={{ padding: 32 }}>
                <Skeleton active paragraph={{ rows: 10 }} />
            </div>
        );

    if (error || !product)
        return (
            <div style={{ padding: 32 }}>
                <Alert type="error" message={error ?? "Không tìm thấy sản phẩm."} />
            </div>
        );

    return (
        <div style={{ background: "#fff", minHeight: "100vh" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 32px" }}>
                {/* ---------- Breadcrumb ---------- */}
                <Breadcrumb
                    items={[
                        { title: <Link to="/"><HomeOutlined /></Link> },
                        { title: <Link to="/products">Sản phẩm</Link> },
                        { title: <span>{product.name}</span> },
                    ]}
                    style={{ marginBottom: 16 }}
                />

                <Row gutter={[24, 24]}>
                    {/* ---------- Gallery ---------- */}
                    <Col xs={24} md={10}>
                        <Card style={{ borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.05)" }} bodyStyle={{ padding: 12 }}>
                            <div
                                style={{
                                    width: "100%",
                                    aspectRatio: "1/1",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                    background: "#fafafa",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 10,
                                }}
                            >
                                {coverUrl ? (
                                    <Image
                                        src={coverUrl}
                                        alt={product.name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        preview={{ src: coverUrl }}
                                    />
                                ) : (
                                    <div style={{ padding: 40, color: "#bbb" }}>No image</div>
                                )}
                            </div>

                            {/* Thumbnails: hiển thị tất cả ảnh biến thể + ảnh SP */}
                            {album.length > 0 && (
                                <div
                                    style={{
                                        // Đã sửa để cuộn ngang
                                        display: "flex", 
                                        flexDirection: "row",
                                        gap: 8,
                                        overflowX: "auto", // Cho phép cuộn ngang
                                        paddingBottom: 8,
                                    }}
                                >
                                    {album.map((u, idx) => {
                                        const isActive = u === coverUrl;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedImage(u)}
                                                style={{
                                                    // Thêm flexShrink: 0 để item không bị co lại
                                                    flexShrink: 0, 
                                                    borderRadius: 8,
                                                    overflow: "hidden",
                                                    border: isActive ? "2px solid #fa541c" : "1px solid #eee",
                                                    cursor: "pointer",
                                                    width: 60, // Kích thước thumbnail cố định
                                                    height: 60,
                                                    background: "#f7f7f7",
                                                }}
                                                title="Xem ảnh"
                                            >
                                                <Image
                                                    src={u}
                                                    alt={`thumb-${idx}`}
                                                    width="100%"
                                                    height={60}
                                                    style={{ objectFit: "cover" }}
                                                    preview={false}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </Col>

                    {/* ---------- Info ---------- */}
                    <Col xs={24} md={14}>
                        <Card style={{ borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.05)" }}>
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                <Title level={3} style={{ margin: 0 }}>
                                    {product.name}
                                </Title>

                                <Space size="middle" wrap>
                                    <Text type="secondary">
                                        Danh mục: <Text strong>{product.category?.name ?? "—"}</Text>
                                    </Text>
                                    <Divider type="vertical" />
                                    <Text type="secondary">
                                        Thương hiệu: <Text strong>{product.brand ?? "—"}</Text>
                                    </Text>
                                </Space>

                                <Divider style={{ margin: "8px 0" }} />

                                {/* Giá + Tồn kho */}
                                <Space size="large" align="center" wrap>
                                    <div
                                        style={{
                                            padding: "12px 16px",
                                            background: "#fffbe6",
                                            border: "1px solid #ffe58f",
                                            borderRadius: 8,
                                            display: "inline-flex",
                                            alignItems: "baseline",
                                            gap: 8,
                                        }}
                                    >
                                        <Title level={3} style={{ color: "#fa541c", margin: 0 }}>
                                            {vnd(salePrice)}
                                        </Title>
                                        {basePrice &&
                                            salePrice &&
                                            Number(basePrice) > Number(salePrice) && (
                                                <Text delete type="secondary">
                                                    {vnd(basePrice)}
                                                </Text>
                                            )}
                                        {discountPercent && <Tag color="red">-{discountPercent}%</Tag>}
                                    </div>


                                </Space>

                                {/* Chọn Size */}
                                {sizes.length > 0 && (
                                    <>
                                        <Text strong>Chọn Size:</Text>
                                        <Radio.Group
                                            value={selectedSize}
                                            onChange={(e) => setSelectedSize(e.target.value)}
                                        >
                                            <Space wrap>
                                                {sizes.map((s) => (
                                                    <Radio.Button key={s} value={s}>
                                                        {s}
                                                    </Radio.Button>
                                                ))}
                                            </Space>
                                        </Radio.Group>
                                    </>
                                )}

                                {/* Chọn Màu */}
                                {colors.length > 0 && (
                                    <>
                                        <Text strong>Chọn Màu:</Text>
                                        <Radio.Group
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                        >
                                            <Space wrap>
                                                {colors.map((c) => (
                                                    <Radio.Button key={c} value={c}>
                                                        {c}
                                                    </Radio.Button>
                                                ))}
                                            </Space>
                                        </Radio.Group>
                                    </>
                                )}
                                <div>
                                    <Text strong>Tồn kho: </Text>
                                    <Text strong style={{ marginRight: 8 }}>{stock}</Text>
                                    <Tag color={inStock ? "green" : "red"}>
                                        {inStock ? "Còn hàng" : "Hết hàng"}
                                    </Tag>
                                </div>
                                <Divider />

                                {/* Mô tả */}
                                <Paragraph style={{ whiteSpace: "pre-wrap" }}>
                                    <Text strong>Mô tả sản phẩm:</Text>
                                    <br />
                                    {product.description ?? "Không có mô tả."}
                                </Paragraph>

                                <Divider />

                                {/* Số lượng + Nút */}
                                <Space align="center" style={{ flexWrap: "wrap" }}>
                                    <Text strong>Số lượng:</Text>
                                    <InputNumber
                                        min={1}
                                        max={Math.max(1, stock)}
                                        value={qty}
                                        onChange={(v) => setQty(v || 1)}
                                        style={{ width: 100 }}
                                    />
                                    <Button
                                        size="large"
                                        style={{ borderRadius: 8 }}
                                        disabled={!inStock}
                                        onClick={() =>
                                            console.log("ADD_TO_CART", {
                                                product_id: product.id,
                                                variant_id: selectedVariant?.id ?? null,
                                                qty,
                                            })
                                        }
                                    >
                                        Thêm vào giỏ
                                    </Button>
                                    <Button
                                        type="primary"
                                        size="large"
                                        style={{ borderRadius: 8 }}
                                        disabled={!inStock}
                                        onClick={() =>
                                            console.log("BUY_NOW", {
                                                product_id: product.id,
                                                variant_id: selectedVariant?.id ?? null,
                                                qty,
                                            })
                                        }
                                    >
                                        Mua ngay
                                    </Button>
                                </Space>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default ProductDetail;