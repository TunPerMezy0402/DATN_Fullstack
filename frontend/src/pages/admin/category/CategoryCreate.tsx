import React, { useState } from "react";
import { Form, Input, Button, Card, message, Upload, Modal } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const getBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const CategoryCreate: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>("");

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith("image/");
    const okExt = /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
    if (!isImage || !okExt) {
      message.error("Chỉ chọn tệp ảnh (png, jpg, jpeg, gif, webp, bmp).");
      return Upload.LIST_IGNORE;
    }
    return false; // chặn antd upload tự động
  };

  const onChange = ({ fileList: list }: { fileList: UploadFile[] }) => {
    setFileList(list.slice(-1)); // chỉ giữ 1 file
  };

  const onPreview = async (file: UploadFile) => {
    if (file.url) {
      setPreviewSrc(file.url);
    } else if (!file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj as File);
      setPreviewSrc(file.preview as string);
    }
    setPreviewOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      const fd = new FormData();
      fd.append("name", values.name);

      const file = fileList[0]?.originFileObj as File | undefined;
      if (file) fd.append("image", file); // 👈 field 'image' trùng tên Laravel

      await axios.post(`${API_URL}/admin/categories`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          // KHÔNG set Content-Type: để axios tự set multipart boundary
        },
      });

      message.success("✅ Thêm danh mục thành công!");
      navigate("/admin/categories");
    } catch (e) {
      console.error("❌ Lỗi khi thêm danh mục:", e);
      message.error("Thêm danh mục thất bại!");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <Card title="Thêm danh mục mới" style={{ maxWidth: 720, margin: "0 auto" }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên danh mục!" }]}
          >
            <Input placeholder="Nhập tên danh mục" />
          </Form.Item>

          <Form.Item label="Ảnh (tùy chọn)">
            <Upload
              listType="picture-card"
              accept="image/*"
              beforeUpload={beforeUpload}
              onChange={onChange}
              onPreview={onPreview}
              fileList={fileList}
              maxCount={1}
            >
              {fileList.length ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                </div>
              )}
            </Upload>

            <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)}>
              <img alt="preview" src={previewSrc} style={{ width: "100%" }} />
            </Modal>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">Lưu danh mục</Button>
            <Button style={{ marginLeft: 10 }} onClick={() => navigate(-1)}>Hủy</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CategoryCreate;
