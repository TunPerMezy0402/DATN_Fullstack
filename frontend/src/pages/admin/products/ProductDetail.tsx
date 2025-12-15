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
  Empty,
  Descriptions,
  Tooltip,
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
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getProduct } from '../../../services/productService';

const { Title, Text, Paragraph } = Typography;

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
  images?: string | string[] | null;
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
  images?: string | string[] | null;
  variation_status?: boolean | number;
  variants?: ProductVariant[];
  category?: { id: number | string; name: string } | null;
}

// ============= UTILS =============
const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const API_ORIGIN = API_URL.replace(/\/?api\/?$/, '');

const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, '')}`;
};

const parseImages = (value?: string | string[] | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const formatPrice = (val?: string | number | null): string => {
  if (val == null || val === '') return '—';
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString('vi-VN') + ' đ' : String(val);
};

const toBool = (val: any): boolean => (typeof val === 'boolean' ? val : !!Number(val));

// ============= COMPONENT =============
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

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

  const columns: ColumnsType<ProductVariant> = [
    {
      title: 'STT',
      width: 60,
      align: 'center',
      render: (_, __, i) => <Text strong>{i + 1}</Text>,
    },
    {
      title: 'Hình ảnh',
      dataIndex: 'image',
      width: 100,
      align: 'center',
      render: (img) => {
        const url = getImageUrl(img);
        return url ? (
          <Image 
            src={url} 
            width={60} 
            height={60} 
            style={{ borderRadius: 8, objectFit: 'cover', border: '1px solid #f0f0f0' }} 
            placeholder={<Spin />}
          />
        ) : (
          <div style={{ 
            width: 60, 
            height: 60, 
            background: '#fafafa', 
            borderRadius: 8, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid #f0f0f0'
          }}>
            <PictureOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
          </div>
        );
      },
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      width: 70,
      render: (sku) => sku ? (
        <Text code copyable={{ text: sku }} style={{ fontSize: 12 }}>{sku}</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Size',
      width: 80,
      align: 'center',
      render: (_, r) => {
        const val = r.size?.value ?? r.size_id;
        return val ? <Tag color="blue">{val}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Màu sắc',
      width: 100,
      align: 'center',
      render: (_, r) => {
        const val = r.color?.value ?? r.color_id;
        return val ? <Tag color="purple">{val}</Tag> : <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      width: 80,
      align: 'right',
      render: (v) => <Text strong style={{ color: '#1890ff', fontSize: 14 }}>{formatPrice(v)}</Text>,
    },
    {
      title: 'Giá KM',
      dataIndex: 'discount_price',
      width: 80,
      align: 'right',
      render: (v, r) => {
        if (v == null || v === '') return <Text type="secondary">—</Text>;
        const valid = Number(v) <= Number(r.price ?? v);
        return (
          <Text strong style={{ color: valid ? '#52c41a' : '#ff4d4f', fontSize: 14 }}>
            {formatPrice(v)}
          </Text>
        );
      },
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock_quantity',
      width: 100,
      align: 'center',
      render: (v) => {
        if (v == null) return <Text type="secondary">—</Text>;
        const color = v > 10 ? '#52c41a' : v > 0 ? '#faad14' : '#ff4d4f';
        return (
          <Tag color={color} style={{ fontSize: 14, fontWeight: 'bold', minWidth: 40 }}>
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_available',
      width: 110,
      align: 'center',
      render: (v) => toBool(v) ? (
        <Tag icon={<CheckCircleOutlined />} color="success">Có sẵn</Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error">Hết hàng</Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        height: '80vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 16
      }}>
        <Spin size="large" />
        <Text type="secondary">Đang tải thông tin sản phẩm...</Text>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ 
        padding: 60, 
        textAlign: 'center',
        background: 'white',
        borderRadius: 12,
        margin: 24
      }}>
        <Empty 
          description={<Text strong style={{ fontSize: 16 }}>Không tìm thấy sản phẩm</Text>}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
        <Button 
          size="large"
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)} 
          style={{ marginTop: 24 }}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const categoryName = product.category?.name || '—';
  const variants = product.variants || [];
  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  const avgPrice = variants.length > 0
    ? variants.reduce((sum, v) => sum + Number(v.price || 0), 0) / variants.length
    : 0;
  const availableVariants = variants.filter(v => toBool(v.is_available)).length;
  const productImages = parseImages(product.images);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Header Card */}
        <Card
          style={{ 
            marginBottom: 24, 
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '32px 40px',
            marginBottom: 24
          }}>
            <Row align="middle" justify="space-between">
              <Col flex="auto">
                <Space size="large" align="start">
                  <div style={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    border: '4px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                    background: 'white'
                  }}>
                    {product.image ? (
                      <Image 
                        src={getImageUrl(product.image)} 
                        width={120} 
                        height={120} 
                        style={{ objectFit: 'cover' }}
                        preview
                      />
                    ) : (
                      <div style={{ 
                        width: 120, 
                        height: 120, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: '#f5f5f5'
                      }}>
                        <ShoppingOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Title level={2} style={{ color: 'white', margin: 0, marginBottom: 12 }}>
                      {product.name}
                    </Title>
                    <Space size="large" wrap>
                      {product.sku && (
                        <Space>
                          <BarcodeOutlined style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }} />
                          <Text 
                            code 
                            style={{ 
                              background: 'rgba(255,255,255,0.25)', 
                              color: 'white', 
                              border: 'none',
                              fontSize: 13,
                              padding: '4px 12px',
                              borderRadius: 4
                            }} 
                            copyable={{ text: product.sku }}
                          >
                            {product.sku}
                          </Text>
                        </Space>
                      )}
                      <Space>
                        <AppstoreOutlined style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }} />
                        <Text style={{ color: 'white', fontSize: 14 }}>{categoryName}</Text>
                      </Space>
                    </Space>
                  </div>
                </Space>
              </Col>
              <Col>
                <Space size="middle">
                  <Button 
                    size="large" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => navigate(-1)}
                  >
                    Quay lại
                  </Button>
                  <Button 
                    size="large" 
                    type="primary" 
                    icon={<EditOutlined />} 
                    onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Chỉnh sửa
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {/* Statistics */}
          <Row gutter={[16, 16]} style={{ padding: '0 16px 16px' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)', 
                  border: '1px solid #b8daff',
                  borderRadius: 8
                }}
              >
                <Statistic
                  title={<Text strong><TagOutlined /> Biến thể</Text>}
                  value={variants.length}
                  valueStyle={{ color: '#1890ff', fontSize: 28, fontWeight: 'bold' }}
                  suffix={<Text type="secondary" style={{ fontSize: 14 }}>mẫu</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', 
                  border: '1px solid #95de64',
                  borderRadius: 8
                }}
              >
                <Statistic
                  title={<Text strong><CheckCircleOutlined /> Còn hàng</Text>}
                  value={availableVariants}
                  valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 'bold' }}
                  suffix={<Text type="secondary" style={{ fontSize: 14 }}>/ {variants.length}</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)', 
                  border: '1px solid #ffc069',
                  borderRadius: 8
                }}
              >
                <Statistic
                  title={<Text strong><InboxOutlined /> Tồn kho</Text>}
                  value={totalStock}
                  valueStyle={{ color: '#fa8c16', fontSize: 28, fontWeight: 'bold' }}
                  suffix={<Text type="secondary" style={{ fontSize: 14 }}>sp</Text>}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card 
                size="small" 
                style={{ 
                  background: 'linear-gradient(135deg, #fff0f6 0%, #ffd6e7 100%)', 
                  border: '1px solid #ffadd2',
                  borderRadius: 8
                }}
              >
                <Statistic
                  title={<Text strong><DollarOutlined /> Giá TB</Text>}
                  value={avgPrice.toFixed(0)}
                  valueStyle={{ color: '#eb2f96', fontSize: 28, fontWeight: 'bold' }}
                  suffix={<Text type="secondary" style={{ fontSize: 14 }}>đ</Text>}
                />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Product Info & Album */}
        <Row gutter={24} style={{ marginBottom: 24 }}>
          {/* Album ảnh sản phẩm */}
          {productImages.length > 0 && (
            <Col xs={24} lg={8}>
              <Card 
                title={<Space><PictureOutlined /> Album ảnh sản phẩm</Space>}
                style={{ borderRadius: 12, height: '100%' }}
              >
                <Image.PreviewGroup>
                  <Row gutter={[8, 8]}>
                    {productImages.map((path, i) => (
                      <Col span={8} key={i}>
                        <Image
                          src={getImageUrl(path)}
                          width="100%"
                          height={80}
                          style={{ borderRadius: 8, objectFit: 'cover' }}
                        />
                      </Col>
                    ))}
                  </Row>
                </Image.PreviewGroup>
              </Card>
            </Col>
          )}

          {/* Thông tin chung */}
          <Col xs={24} lg={productImages.length > 0 ? 8 : 12}>
            <Card 
              title={<Space><CrownOutlined /> Thông tin chung</Space>}
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<Text strong>Thương hiệu</Text>}>
                  {product.brand || <Text type="secondary">Chưa cập nhật</Text>}
                </Descriptions.Item>
                <Descriptions.Item label={<Text strong>Xuất xứ</Text>}>
                  <Space>
                    <GlobalOutlined />
                    {product.origin || <Text type="secondary">Chưa cập nhật</Text>}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label={<Text strong>Biến thể</Text>}>
                  {toBool(product.variation_status) ? (
                    <Tag icon={<CheckCircleOutlined />} color="processing">Đang bật</Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="default">Đang tắt</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Mô tả */}
          <Col xs={24} lg={productImages.length > 0 ? 8 : 12}>
            <Card 
              title="Mô tả sản phẩm"
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Paragraph 
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.8,
                  color: '#595959',
                  marginBottom: 0
                }}
              >
                {product.description || <Text type="secondary" italic>Chưa có mô tả cho sản phẩm này</Text>}
              </Paragraph>
            </Card>
          </Col>
        </Row>

        {/* Variants Table */}
        <Card
          title={
            <Space style={{ fontSize: 16 }}>
              <AppstoreOutlined style={{ fontSize: 20 }} />
              <Text strong>Danh sách biến thể ({variants.length})</Text>
            </Space>
          }
          style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        >
          {variants.length === 0 ? (
            <Empty 
              description={<Text>Sản phẩm chưa có biến thể nào</Text>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={variants}
              rowKey="id"
              pagination={{ 
                pageSize: 10, 
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} trong ${total} biến thể`,
                pageSizeOptions: ['10', '20', '50', '100']
              }}
              scroll={{ x: 1200 }}
              bordered
              size="middle"
            />
          )}
        </Card>
      </div>
    </div>
  );
}