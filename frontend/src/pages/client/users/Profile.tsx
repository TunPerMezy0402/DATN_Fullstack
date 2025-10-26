import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user_data");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/login"); 
    }
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white shadow-md rounded-lg border border-gray-100">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
        Thông tin cá nhân
      </h1>

      <div className="flex flex-col items-center mb-6">
        <img
          src={
            user?.avatar ||
            "https://cdn-icons-png.flaticon.com/512/149/149071.png"
          }
          alt="Avatar"
          className="w-24 h-24 rounded-full border-2 border-green-500 mb-3"
        />
        <h2 className="text-lg font-medium text-gray-700">{user?.name}</h2>
        <p className="text-gray-500 text-sm">{user?.email}</p>
      </div>

      <div className="space-y-4 border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Họ tên:</span>
          <span className="text-gray-800">{user?.name || "Chưa có"}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Email:</span>
          <span className="text-gray-800">{user?.email || "Chưa có"}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Số điện thoại:</span>
          <span className="text-gray-800">{user?.phone || "Chưa có"}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Địa chỉ:</span>
          <span className="text-gray-800">{user?.address || "Chưa có"}</span>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md"
        >
          Quay lại trang chủ
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user_data");
            navigate("/login");
          }}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default Profile;
