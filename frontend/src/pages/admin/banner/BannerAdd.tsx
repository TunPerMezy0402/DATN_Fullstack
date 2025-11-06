import React, { useState } from "react";
import { Input, Switch, Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { createBanner, IBanner, IBannerImage } from "../../../api/bannerApi";

const BannerAdd = () => {
  const navigate = useNavigate();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<IBanner>({
    defaultValues: { is_active: true },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("http://localhost:8000/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.url;
  };

  const onSubmit = async (data: IBanner) => {
    try {
      let images: IBannerImage[] = [];

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        images.push({
          id: 0,
          banner_id: 0,
          image: uploadedUrl,
          image_url: uploadedUrl,
          is_active: true,
        });
      } else if (imageUrlInput.trim()) {
        images.push({
          id: 0,
          banner_id: 0,
          image: imageUrlInput.trim(),
          image_url: imageUrlInput.trim(),
          is_active: true,
        });
      } else {
        message.error("Vui lòng chọn ảnh hoặc nhập URL");
        return;
      }

      const payload = {
        title: data.title,
        link: data.link || undefined,
        is_active: watch("is_active"),
        images,
      };

      await createBanner(payload);
      message.success("Tạo banner thành công!");
      navigate("/admin/banner-list");
    } catch (error) {
      console.error(error);
      message.error("Tạo banner thất bại!");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Thêm banner mới</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tiêu đề */}
        <div>
          <label>Tiêu đề</label>
          <Input {...register("title", { required: "Tiêu đề không được để trống" })} />
          {errors.title && <p className="text-red-500">{errors.title.message}</p>}
        </div>

        {/* Ảnh */}
        <div>
          <label>URL hoặc Upload ảnh</label>
          <Input
            placeholder="Nhập URL ảnh"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          {(imageFile || imageUrlInput) && (
            <img
              src={imageFile ? URL.createObjectURL(imageFile) : imageUrlInput}
              alt="Preview"
              className="w-32 h-20 object-cover mt-2 border rounded"
            />
          )}
        </div>

        {/* Link */}
        <div>
          <label>Link (tùy chọn)</label>
          <Input {...register("link")} placeholder="/blog/slug-hoac-link" />
        </div>

        {/* Hiển thị */}
        <div className="flex items-center gap-2">
          <label>Hiển thị</label>
          <Switch
            defaultChecked
            onChange={(checked) => setValue("is_active", checked)}
            checked={watch("is_active")}
          />
        </div>

        {/* Submit */}
        <div>
          <Button type="primary" htmlType="submit">
            Thêm mới
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BannerAdd;
