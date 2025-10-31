import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBannerImages,
  getTrashedBannerImages,
  deleteBannerImage,
  restoreBannerImage,
  forceDeleteBannerImage,
} from "../../../services/bannerImageApi";

type BannerImage = {
  id: number;
  image: string;
  is_active: boolean;
};

const BannerList: React.FC = () => {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<"all" | "trash">("all");

  const fetchImages = async () => {
    setLoading(true);
    try {
      const data = tab === "all" ? await getBannerImages() : await getTrashedBannerImages();
      setImages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [tab]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa?")) return;
    await deleteBannerImage(id);
    fetchImages();
  };

  const handleRestore = async (id: number) => {
    await restoreBannerImage(id);
    fetchImages();
  };

  const handleForceDelete = async (id: number) => {
    if (!confirm("Xóa vĩnh viễn sẽ không thể phục hồi!")) return;
    await forceDeleteBannerImage(id);
    fetchImages();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý Banner</h2>

      {/* Tab */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${tab === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setTab("all")}
        >
          Tất cả
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === "trash" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setTab("trash")}
        >
          Thùng rác
        </button>
        <Link to="/banner/add/1" className="bg-green-500 px-4 py-2 rounded text-white">
          Thêm Banner
        </Link>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div>Đang tải...</div>
      ) : images.length === 0 ? (
        <div>Không có banner nào</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="border p-2 rounded shadow">
              <img
                src={`http://127.0.0.1:8000/storage/${img.image}`}
                alt="Banner"
                className="w-full h-40 object-cover mb-2"
              />
              <span className={`text-sm ${img.is_active ? "text-green-500" : "text-red-500"}`}>
                {img.is_active ? "Active" : "Inactive"}
              </span>

              <div className="mt-2 flex space-x-2">
                {tab === "all" ? (
                  <React.Fragment>
                    <Link
                      to={`/banner/edit/${img.id}`}
                      className="bg-yellow-400 px-2 py-1 rounded"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="bg-red-500 px-2 py-1 rounded text-white"
                    >
                      Xóa
                    </button>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <button
                      onClick={() => handleRestore(img.id)}
                      className="bg-green-400 px-2 py-1 rounded"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleForceDelete(img.id)}
                      className="bg-red-700 px-2 py-1 rounded text-white"
                    >
                      Xóa vĩnh viễn
                    </button>
                  </React.Fragment>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerList;
