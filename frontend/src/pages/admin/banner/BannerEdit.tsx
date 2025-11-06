import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input, Switch, Button, message } from "antd";
import { useForm } from "react-hook-form";
import { IBanner, IBannerImage, getBannerById, updateBanner } from "../../../api/bannerApi";

const BannerEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<IBanner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const { register, handleSubmit, setValue, watch } = useForm<IBanner>();

  // Lấy dữ liệu banner từ API
  useEffect(() => {
    const fetchBanner = async () => {
      if (!id) return;
      try {
        const data = await getBannerById(Number(id));
        setBanner(data);
        setValue("title", data.title);
        setValue("link", data.link || "");
        setValue("is_active", data.is_active);
        if (data.images?.length > 0) {
          setImageUrlInput(data.images[0].image_url);
        }
      } catch (error) {
        console.error(error);
        message.error("Không lấy được dữ liệu banner");
      }
    };
    fetchBanner();
  }, [id, setValue]);

  // Upload ảnh nếu có
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
          banner_id: Number(id),
          image: uploadedUrl,
          image_url: uploadedUrl,
          is_active: true,
        });
      } else if (imageUrlInput.trim()) {
        images.push({
          id: 0,
          banner_id: Number(id),
          image: imageUrlInput.trim(),
          image_url: imageUrlInput.trim(),
          is_active: true,
        });
      }

      const payload: Partial<IBanner> = {
        title: data.title,
        link: data.link || undefined,
        is_active: watch("is_active"),
        images,
      };

      await updateBanner(Number(id), payload);
      message.success("Cập nhật banner thành công!");
      navigate("/admin/banner-list");
    } catch (error) {
      console.error(error);
      message.error("Cập nhật thất bại!");
    }
  };

  if (!banner) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Chỉnh sửa banner</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label>Tiêu đề</label>
          <Input {...register("title", { required: true })} defaultValue={banner.title} />
        </div>

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

        <div>
          <label>Link (tùy chọn)</label>
          <Input {...register("link")} defaultValue={banner.link || ""} />
        </div>

        <div className="flex items-center gap-2">
          <label>Hiển thị</label>
          <Switch
            defaultChecked={banner.is_active}
            onChange={(checked) => setValue("is_active", checked)}
            checked={watch("is_active")}
          />
        </div>

        <div>
          <Button type="primary" htmlType="submit">
            Cập nhật
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BannerEdit;
