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
      const res = await getAllBanners(1, 50); // paginate
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
      render: (record: IBanner) => (
        <Image
          width={100}
          src={record.images?.[0]?.image_url}
          fallback="https://via.placeholder.com/100"
        />
      ),
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
    },
    {
      title: "Link",
      dataIndex: "link",
      render: (text: string) =>
        text ? (
          <a href={text} target="_blank">
            {text}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "Hiển thị",
      dataIndex: "is_active",
      render: (active: boolean) =>
        active ? (
          <Tag color="green">Đang hiển thị</Tag>
        ) : (
          <Tag color="red">Ẩn</Tag>
        ),
    },
    {
      title: "Hành động",
      render: (record: IBanner) => (
        <div className="flex gap-2">
          <Button
            type="primary"
            onClick={() => navigate(`/admin/banner/edit/${record.id}`)}
          >
            Sửa
          </Button>

          <Popconfirm
            title="Bạn chắc chắn xoá?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger>Xoá</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 bg-white shadow rounded">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Danh sách Banner</h2>
        <Button type="primary" onClick={() => navigate("/admin/banners/add")}>
          + Thêm mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={banners}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default BannerList;
