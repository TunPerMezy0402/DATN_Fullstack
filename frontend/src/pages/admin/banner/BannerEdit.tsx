import React, { useState, useEffect } from "react";
import { updateBannerImage } from "../../../services/bannerImageApi";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const BannerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);

  useEffect(()=>{
    const fetchBanner = async () => {
      const res = await axios.get(`http://127.0.0.1:8000/api/admin/banner-images/${id}`);
      setIsActive(res.data.is_active);
    }
    fetchBanner();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if(file) formData.append("image", file);
    formData.append("is_active", isActive ? "1" : "0");

    try{
      await updateBannerImage(Number(id), formData);
      navigate("/banner");
    } catch(err){
      console.error(err);
      alert("Cập nhật thất bại");
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Sửa Banner</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} />
          <span>Active</span>
        </label>
        <button type="submit" className="bg-yellow-500 px-4 py-2 rounded text-white">Cập nhật Banner</button>
      </form>
    </div>
  );
};

export default BannerEdit;
