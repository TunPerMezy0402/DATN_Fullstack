// src/pages/admin/products/ProductDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Divider,
  Image,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  Statistic,
  Badge,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  ShoppingOutlined,
  TagOutlined,
  BarcodeOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  CrownOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getProduct } from '../../../services/productService';

const { Title, Text } = Typography;

// ============= TYPES =============
interface ProductVariant {
  id: number;
  size_id?: number | null;
  color_id?: number | null;
  size?: { id: number; value: string } | null;
  color?: { id: number; value: string } | null;
  sku?: string | null;
  price?: string | number | null;
  discount_price?: string | number | null;
  stock_quantity?: number | null;
  is_available?: boolean | number | null;
  image?: string | null;
  images?: string[] | null;
}

interface Product {
  id: number;
  name: string;
  sku?: string | null;
  category_id?: number | string | null;
  origin?: string | null;
  brand?: string | null;
  description?: string | null;
  image?: string | null;
  variation_status?: boolean | number;
  variants?: ProductVariant[];
  category?: { id: number | string; name: string } | null;
  category_option?: { value: number; label: string } | null;
}

// ============= UTILS =============
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const API_ORIGIN = API_URL.replace(/\/?api\/?$/, '');

const getImageUrl = (path?: string | null) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, '')}`;
};

const formatPrice = (val?: string | number | null) => {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') + ' đ' : String(val);
};

const toBool = (val: any) => (typeof val === 'boolean' ? val : !!Number(val));

// ============= COMPONENT =============
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getProduct(Number(id));
      const data = res?.data?.data ?? res?.data ?? res;
      setProduct(data);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const openPreview = (imgs: string[], idx = 0) => {
    if (!imgs?.length) return;
    setPreviewImages(imgs.map(getImageUrl));
    setPreviewIndex(idx);
    setPreviewOpen(true);
  };

  const columns: ColumnsType<ProductVariant> = [
    {
      title: '#',
      width: 60,
      align: 'center',
      render: (_, __, i) => i + 1,
    },
    {
      title: 'Album',
      dataIndex: 'images',
      width: 150,
      render: (arr?: string[]) => {
        if (!arr?.length) return <Text type="secondary">—</Text>;
        return (
          <Space size={4}>
            {arr.slice(0, 2).map((p, i) => (
              <Image
                key={i}
                src={getImageUrl(p)}
                width={50}
                height={50}
                style={{ borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                preview={false}
                onClick={() => openPreview(arr, i)}
              />
            ))}
            {arr.length > 2 && (
              <Button size="small" type="link" onClick={() => openPreview(arr, 2)}>
                +{arr.length - 2}
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 140,
      render: (sku) => (sku ? <Text code copyable={{ text: sku }}>{sku}</Text> : '—'),
    },
    {
      title: 'Size',
      width: 50,
      render: (_, r) => r.size?.value ?? r.size_id ?? '—',
    },
    {
      title: 'Màu',
      width: 50,
      render: (_, r) => r.color?.value ?? r.color_id ?? '—',
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (v) => <Text strong>{formatPrice(v)}</Text>,
    },
    {
      title: 'Giá KM',
      dataIndex: 'discount_price',
      width: 100,
      align: 'right',
      render: (v, r) => {
        if (v == null || v === '') return '—';
        const valid = Number(v) <= Number(r.price ?? v);
        return <Text type={valid ? 'success' : 'danger'}>{formatPrice(v)}</Text>;
      },
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock_quantity',
      width: 100,
      align: 'right',
      render: (v) => {
        if (v == null) return '—';
        return (
          <Text strong style={{ color: v > 0 ? '#52c41a' : '#ff4d4f' }}>
            {v}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_available',
      width: 110,
      align: 'center',
      render: (v) => (toBool(v) ? <Tag color="success">Có sẵn</Tag> : <Tag color="error">Hết</Tag>),
    },
  ];

  if (loading) {
    return (
      <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="Không tìm thấy sản phẩm" />
        <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginTop: 16 }}>
          Quay lại
        </Button>
      </div>
    );
  }

  const categoryName = product.category?.name || product.category_option?.label || '—';
  const variants = product.variants || [];
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const avgPrice = variants.length > 0
    ? variants.reduce((sum, v) => sum + Number(v.price || 0), 0) / variants.length
    : 0;

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <Card
          style={{ marginBottom: 24, borderRadius: 12 }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px 12px 0 0' }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Space size="large" align="center">
                  <div style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {product.image ? (
                      <Image src={getImageUrl(product.image)} width={100} height={100} style={{ objectFit: 'cover' }} preview />
                    ) : (
                      <div style={{ width: 100, height: 100, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingOutlined style={{ fontSize: 40, color: '#bfbfbf' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Title level={3} style={{ color: 'white', margin: 0, marginBottom: 8 }}>
                      {product.name}
                    </Title>
                    {product.sku && (
                      <Space>
                        <BarcodeOutlined style={{ color: 'rgba(255,255,255,0.8)' }} />
                        <Text code style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} copyable={{ text: product.sku }}>
                          {product.sku}
                        </Text>
                      </Space>
                    )}
                  </div>
                </Space>
              </Col>
              <Col>
                <Space size="middle">
                  <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                    Quay lại
                  </Button>
                  <Button size="large" type="primary" icon={<EditOutlined />} onClick={() => navigate(`/admin/products/${product.id}/edit`)} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                    Chỉnh sửa
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {/* Stats */}
          <div style={{ padding: '24px 32px', background: 'white' }}>
            <Row gutter={24}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#f0f5ff', border: 'none' }}>
                  <Statistic
                    title={<Space><AppstoreOutlined /> Danh mục</Space>}
                    value={categoryName}
                    valueStyle={{ fontSize: 16, color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#f6ffed', border: 'none' }}>
                  <Statistic
                    title={<Space><TagOutlined /> Số biến thể</Space>}
                    value={variants.length}
                    valueStyle={{ fontSize: 20, color: '#52c41a', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#fff7e6', border: 'none' }}>
                  <Statistic
                    title={<Space><ShoppingOutlined /> Tổng tồn kho</Space>}
                    value={totalStock}
                    valueStyle={{ fontSize: 20, color: '#fa8c16', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" style={{ background: '#fff0f6', border: 'none' }}>
                  <Statistic
                    title="Giá TB"
                    value={avgPrice > 0 ? avgPrice.toFixed(0) : 0}
                    suffix="đ"
                    valueStyle={{ fontSize: 18, color: '#eb2f96' }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        </Card>

        {/* Info Cards */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card title={<Space><CrownOutlined /> Thông tin chung</Space>} style={{ borderRadius: 12, height: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary">Thương hiệu</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong>{product.brand || '—'}</Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Xuất xứ</Text>
                  <div style={{ marginTop: 4 }}>
                    <Space>
                      <GlobalOutlined />
                      <Text strong>{product.origin || '—'}</Text>
                    </Space>
                  </div>
                </Col>
                <Col span={24}>
                  <Text type="secondary">Trạng thái biến thể</Text>
                  <div style={{ marginTop: 4 }}>
                    {toBool(product.variation_status) ? (
                      <Tag color="processing" style={{ fontSize: 14, padding: '4px 12px' }}>✓ Đang bật</Tag>
                    ) : (
                      <Tag color="default" style={{ fontSize: 14, padding: '4px 12px' }}>✕ Đang tắt</Tag>
                    )}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Mô tả sản phẩm" style={{ borderRadius: 12, height: '100%' }}>
              <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#595959' }}>
                {product.description || 'Chưa có mô tả'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Variants Table */}
        <Card
          title={<Space style={{ fontSize: 16 }}><AppstoreOutlined /> Danh sách biến thể</Space>}
          style={{ borderRadius: 12 }}
        >
          {variants.length === 0 ? (
            <Empty description="Chưa có biến thể" />
          ) : (
            <Table
              columns={columns}
              dataSource={variants}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng ${total}` }}
              scroll={{ x: 1100 }}
            />
          )}
        </Card>

        {/* Preview Modal */}
        {previewOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setPreviewOpen(false)}
          >
            <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
              <Image.PreviewGroup
                preview={{
                  current: previewIndex,
                  onChange: setPreviewIndex,
                  visible: previewOpen,
                  onVisibleChange: setPreviewOpen,
                }}
              >
                {previewImages.map((src, i) => (
                  <Image key={i} src={src} style={{ display: i === previewIndex ? 'block' : 'none' }} />
                ))}
              </Image.PreviewGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}