import React, { useState } from "react";
import { createBannerImage } from "../../../services/bannerImageApi";
import { useNavigate, useParams } from "react-router-dom";

const BannerAdd: React.FC = () => {
  const navigate = useNavigate();
  const { bannerId } = useParams<{ bannerId: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!file) return alert("Chọn file ảnh");
    const formData = new FormData();
    formData.append("image", file);
    formData.append("is_active", isActive ? "1" : "0");

    try {
      await createBannerImage(Number(bannerId), formData);
      navigate("/banner");
    } catch (err) {
      console.error(err);
      alert("Thêm banner thất bại");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Thêm Banner</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} />
          <span>Active</span>
        </label>
        <button type="submit" className="bg-green-500 px-4 py-2 rounded text-white">Thêm Banner</button>
      </form>
    </div>
  );
};

export default BannerAdd;
