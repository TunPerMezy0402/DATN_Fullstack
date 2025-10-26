import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Wishlist: React.FC = () => {
  const [wishlist, setWishlist] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("wishlist") || "[]");
    setWishlist(data);
  }, []);

  const handleRemove = (id: number) => {
    const updated = wishlist.filter(item => item.id !== id);
    setWishlist(updated);
    localStorage.setItem("wishlist", JSON.stringify(updated));
  };

  const handleGoToProduct = (id: number) => {
    navigate(`/products/${id}`);
  };

  if (wishlist.length === 0) {
    return <div className="p-8 text-center text-gray-600">Danh sách yêu thích trống!</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-xl font-semibold mb-4">Danh sách yêu thích</h2>
      <ul className="space-y-4">
        {wishlist.map(item => (
          <li key={item.id} className="flex justify-between items-center border p-4 rounded shadow-sm">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleGoToProduct(item.id)}>
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
              <span>{item.name}</span>
            </div>
            <button
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => handleRemove(item.id)}
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Wishlist;
