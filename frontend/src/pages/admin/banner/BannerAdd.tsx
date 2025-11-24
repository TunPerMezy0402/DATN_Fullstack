import React, { useState } from "react";
import { Input, Switch, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { createBanner, IBannerImage } from "../../../api/bannerApi";

const BannerAdd = () => {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");

  // ĐÃ SỬA: DÙNG TYPE RÕ RÀNG, KHÔNG CẦN interface
  const { 
    setValue, 
    watch, 
    handleSubmit,
    formState: { errors } 
  } = useForm<{
    title?: string;
    link?: string;
    is_active?: boolean;
  }>({
    defaultValues: { is_active: true },
  });

  const titleValue = watch("title");

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch("http://localhost:8000/api/admin/upload", {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) throw new Error("Upload thất bại");
    const data = await res.json();
    return data.url;
  };

  const onSubmit = async (data: any) => {
  try {
    let images: any[] = [];

    if (imageFile) {
      images.push({
        file: imageFile,
        is_active: true,
      });
    } else if (imageUrlInput.trim()) {
      images.push({
        url: imageUrlInput.trim(),
        is_active: true,
      });
    } else {
      message.error("Vui lòng chọn ảnh hoặc nhập URL");
      return;
    }

    const payload = {
      title: data.title,
      link: data.link,
      is_active: data.is_active,
      images,
    };

    await createBanner(payload);
    message.success("Tạo banner thành công!");
    navigate("/admin/banner-list");
  } catch (error: any) {
    message.error(error.message || "Tạo banner thất bại!");
  }
};

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
        Thêm Banner Mới
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* TIÊU ĐỀ - ĐÃ SỬA: KHÔNG CÒN TS2322 */}
        <div>
          <label className="block font-medium mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <Input
            value={titleValue || ""}
            onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
            placeholder="Nhập tiêu đề banner"
            size="large"
            status={errors.title ? "error" : undefined}
          />
          {errors.title?.message && (
            <p className="text-red-500 text-sm mt-1">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* ẢNH */}
        <div>
          <label className="block font-medium mb-1">
            URL hoặc Upload ảnh <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Dán URL ảnh (ví dụ: https://picsum.photos/800/400)"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            className="mb-2"
            size="large"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {(imageFile || imageUrlInput) && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Xem trước:</p>
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : imageUrlInput}
                alt="Preview"
                className="w-full max-w-xs h-40 object-cover rounded-lg border shadow-sm"
              />
            </div>
          )}
        </div>

        {/* LINK */}
        <div>
          <label className="block font-medium mb-1">Link (tùy chọn)</label>
          <Input
            value={watch("link") || ""}
            onChange={(e) => setValue("link", e.target.value)}
            placeholder="https://example.com"
            size="large"
          />
        </div>

        {/* HIỂN THỊ */}
        <div className="flex items-center gap-3">
          <label className="font-medium">Hiển thị:</label>
          <Switch
            checked={watch("is_active") ?? true}
            onChange={(checked) => setValue("is_active", checked)}
          />
        </div>

        {/* NÚT */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button size="large" onClick={() => navigate("/admin/banner-list")}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" size="large">
            Thêm Banner
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BannerAdd;