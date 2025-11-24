import React, { useEffect, useState } from "react";
import { Table, Button, Image, Tag, Popconfirm, message } from "antd";
import { useNavigate } from "react-router-dom";
import { deleteBanner, getAllBanners, IBanner } from "../../../api/bannerApi";

const BannerList = () => {
  const [banners, setBanners] = useState<IBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await getAllBanners(1, 50);
      setBanners(res.data || []);
    } catch (error) {
      message.error("Không thể lấy danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteBanner(id);
      message.success("Xoá banner thành công");
      fetchBanners();
    } catch {
      message.error("Xoá thất bại");
    }
  };

  const columns = [
    {
      title: "Ảnh",
      width: 120,
      render: (record: IBanner) => {
        const imageUrl = record.images?.[0]?.image_url;

        if (!imageUrl) {
          return <Image width={100} src="https://via.placeholder.com/100" alt="No image" />;
        }

        const fullUrl = imageUrl.startsWith("http")
          ? imageUrl
          : `http://localhost:8000${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;

        return (
          <Image
            width={100}
            height={60}
            src={fullUrl}
            fallback="https://via.placeholder.com/100"
            preview={{ src: fullUrl }}
            style={{ objectFit: "cover", borderRadius: 6 }}
            alt={record.title}
          />
        );
      },
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      ellipsis: true,
    },
    {
      title: "Link",
      dataIndex: "link",
      render: (text: string) =>
        text ? (
          <a href={text} target="_blank" rel="noopener noreferrer" className="text-blue-600">
            {text.length > 50 ? `${text.substring(0, 50)}...` : text}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "Hiển thị",
      dataIndex: "is_active",
      render: (active: boolean) =>
        active ? (
          <Tag color="success">Đang hiển thị</Tag>
        ) : (
          <Tag color="error">Ẩn</Tag>
        ),
    },
    {
      title: "Hành động",
      width: 180,
      render: (record: IBanner) => (
        <div className="flex gap-2">
          <Button
            size="small"
            type="primary"
            onClick={() => navigate(`/admin/banner/edit/${record.id}`)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Bạn có chắc chắn xoá banner này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xoá"
            cancelText="Hủy"
          >
            <Button size="small" danger>
              Xoá
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Danh sách Banner</h2>
        <Button type="primary" size="large" onClick={() => navigate("/admin/banner/add")}>
          + Thêm Banner Mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={banners}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Tổng ${total} banner`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default BannerList;