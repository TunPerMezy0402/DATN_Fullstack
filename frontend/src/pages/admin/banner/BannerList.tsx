import React, { useEffect, useState } from "react";
import { Table, Button, message } from "antd";
import { IBanner, getAllBanners, deleteBanner } from "../../../api/bannerApi";
import { Link } from "react-router-dom";

const BannerList = () => {
  const [banners, setBanners] = useState<IBanner[]>([]);

  const fetchData = async () => {
    try {
      const res = await getAllBanners();
      setBanners(res.data);
    } catch (error) {
      message.error("Không thể tải danh sách banner!");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteBanner(id);
      message.success("Đã xóa banner!");
      fetchData();
    } catch {
      message.error("Lỗi khi xóa!");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Danh sách Banner</h1>
        <Link to="/admin/banners/add">
          <Button type="primary">Thêm banner</Button>
        </Link>
      </div>
      <Table
        dataSource={banners}
        rowKey="id"
        columns={[
          { title: "ID", dataIndex: "id" },
          { title: "Tiêu đề", dataIndex: "title" },
          {
            title: "Trạng thái",
            render: (_, record) => (record.is_active ? "Hoạt động" : "Ẩn"),
          },
          {
            title: "Hành động",
            render: (_, record) => (
              <>
                <Link to={`/admin/banners/edit/${record.id}`}>
                  <Button type="link">Sửa</Button>
                </Link>
                <Button danger onClick={() => handleDelete(record.id)}>
                  Xóa
                </Button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default BannerList;
