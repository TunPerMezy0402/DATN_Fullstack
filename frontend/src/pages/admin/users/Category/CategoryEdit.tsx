import React, { useEffect, useState } from "react";
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  message, 
  Upload, 
  Modal, 
  Checkbox, 
  Space,
  Spin 
} from "antd";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { PlusOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";
import axios, { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";

// ==================== CONSTANTS ====================
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ==================== INTERFACES ====================
interface Category {
  id: number;
  name: string;
  image_url?: string;
}

interface FormValues {
  name: string;
  remove_image: boolean;
}

// ==================== UTILITIES ====================
const getBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const validateImageFile = (file: File): boolean => {
  const isValidType = ALLOWED_IMAGE_TYPES.includes(file.type);
  if (!isValidType) {
    message.error("Chỉ chấp nhận file ảnh định dạng: PNG, JPG, JPEG, GIF, WEBP");
    return false;
  }

  const isValidSize = file.size <= MAX_FILE_SIZE;
  if (!isValidSize) {
    message.error("Kích thước file không được vượt quá 5MB");
    return false;
  }

  return true;
};

// ==================== COMPONENT ====================
const CategoryEdit: React.FC = () => {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const token = localStorage.getItem("access_token");

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string>("");
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [hasNewImage, setHasNewImage] = useState<boolean>(false);

  // ==================== FETCH CATEGORY DATA ====================
  useEffect(() => {
    if (!id || !token) {
      message.error("Thiếu thông tin cần thiết");
      navigate("/admin/categories");
      return;
    }

    fetchCategoryData();
  }, [id]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/admin/categories/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Normalize response data
      const rawData = response.data;
      const category: Category = (rawData?.data ?? rawData) as Category;

      if (!category || !category.name) {
        throw new Error("Không tìm thấy dữ liệu danh mục");
      }

      // Set form values
      form.setFieldsValue({
        name: category.name || "",
        remove_image: false,
      });

      // Set existing image
      if (category.image_url) {
        setOriginalImageUrl(category.image_url);
        setFileList([
          {
            uid: "-1",
            name: "current-image.jpg",
            status: "done",
            url: category.image_url,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching category:", error);
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 404) {
        message.error("Không tìm thấy danh mục");
      } else if (axiosError.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn");
        navigate("/login");
      } else {
        message.error("Không thể tải dữ liệu danh mục");
      }
      
      navigate("/admin/categories");
    } finally {
      setLoading(false);
    }
  };

  // ==================== UPLOAD HANDLERS ====================
  const beforeUpload = (file: File) => {
    if (!validateImageFile(file)) {
      return Upload.LIST_IGNORE;
    }
    return false; // Prevent auto upload
  };

  const handleChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    const latestFile = newFileList.slice(-1); // Keep only the latest file
    setFileList(latestFile);
    setHasNewImage(!!latestFile[0]?.originFileObj);
    
    // Reset remove_image checkbox when new image is selected
    if (latestFile[0]?.originFileObj) {
      form.setFieldValue("remove_image", false);
    }
  };

  const handlePreview = async (file: UploadFile) => {
    let preview = file.url || file.preview;

    if (!preview && file.originFileObj) {
      preview = await getBase64(file.originFileObj as File);
    }

    setPreviewImage(preview || "");
    setPreviewOpen(true);
  };

  const handleRemoveImage = () => {
    setFileList([]);
    setHasNewImage(false);
    form.setFieldValue("remove_image", true);
  };

  // ==================== FORM SUBMISSION ====================
  const handleSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      const formData = new FormData();

      // Add category name
      formData.append("name", values.name.trim());

      // Handle image logic
      const newFile = fileList[0]?.originFileObj as File | undefined;

      if (newFile) {
        // User selected a new image
        formData.append("image", newFile);
      } else if (values.remove_image && !hasNewImage) {
        // User wants to remove existing image
        formData.append("remove_image", "1");
      }
      // If no new image and remove_image is false, keep existing image

      // Laravel method spoofing for PUT request with multipart/form-data
      formData.append("_method", "PUT");

      await axios.post(`${API_URL}/admin/categories/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type, let axios handle multipart boundary
        },
      });

      message.success("Cập nhật danh mục thành công!");
      navigate("/admin/categories");
    } catch (error) {
      console.error("Error updating category:", error);
      const axiosError = error as AxiosError<{ message?: string }>;

      if (axiosError.response?.status === 422) {
        message.error(
          axiosError.response.data?.message || "Dữ liệu không hợp lệ"
        );
      } else if (axiosError.response?.status === 401) {
        message.error("Phiên đăng nhập hết hạn");
        navigate("/login");
      } else {
        message.error("Cập nhật danh mục thất bại!");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div style={{ 
        padding: 24, 
        minHeight: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center" 
      }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      minHeight: "100vh", 
      backgroundColor: "#f0f2f5" 
    }}>
      <Card
        title="Sửa danh mục"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderRadius: 8,
        }}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleSubmit}
          disabled={submitting}
        >
          {/* Category Name */}
          <Form.Item
            label="Tên danh mục"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên danh mục!" },
              { min: 2, message: "Tên danh mục phải có ít nhất 2 ký tự" },
              { max: 100, message: "Tên danh mục không được vượt quá 100 ký tự" },
            ]}
          >
            <Input 
              placeholder="Nhập tên danh mục" 
              size="large"
              showCount
              maxLength={100}
            />
          </Form.Item>

          {/* Image Upload */}
          <Form.Item label="Ảnh danh mục">
            <Upload
              listType="picture-card"
              accept="image/*"
              beforeUpload={beforeUpload}
              onChange={handleChange}
              onPreview={handlePreview}
              fileList={fileList}
              maxCount={1}
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                previewIcon: <EyeOutlined />,
                removeIcon: <DeleteOutlined />,
              }}
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined style={{ fontSize: 24 }} />
                  <div style={{ marginTop: 8 }}>Chọn ảnh</div>
                </div>
              )}
            </Upload>

            <div style={{ 
              marginTop: 8, 
              fontSize: 12, 
              color: "#999" 
            }}>
              Định dạng: PNG, JPG, JPEG, GIF, WEBP. Tối đa 5MB.
            </div>
          </Form.Item>

          {/* Action Buttons */}
          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space size="middle">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={submitting}
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button
                size="large"
                onClick={() => navigate("/admin/categories")}
                disabled={submitting}
              >
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title="Xem trước ảnh"
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        centered
        width={800}
      >
        <img
          alt="preview"
          src={previewImage}
          style={{ 
            width: "100%", 
            borderRadius: 8,
            maxHeight: "70vh",
            objectFit: "contain"
          }}
        />
      </Modal>
    </div>
  );
};

export default CategoryEdit;