import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Cart: React.FC = () => {
  const [cart, setCart] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(data);
  }, []);

  const handleRemove = (id: number) => {
    const updated = cart.filter(item => item.id !== id);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const handleQuantityChange = (id: number, qty: number) => {
    const updated = cart.map(item =>
      item.id === id ? { ...item, quantity: qty } : item
    );
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const handleCheckout = () => {
    alert("Thanh toán thành công!");
    setCart([]);
    localStorage.setItem("cart", "[]");
  };

  if (cart.length === 0) {
    return <div className="p-8 text-center text-gray-600">Giỏ hàng trống!</div>;
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-xl font-semibold mb-4">Giỏ hàng</h2>
      <ul className="space-y-4">
        {cart.map(item => (
          <li key={item.id} className="flex justify-between items-center border p-4 rounded shadow-sm">
            <div className="flex items-center gap-4">
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
              <span>{item.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => handleQuantityChange(item.id, parseInt(e.target.value))}
                className="w-16 border rounded px-2 py-1"
              />
              <span>{(item.price * item.quantity).toLocaleString()}₫</span>
              <button
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleRemove(item.id)}
              >
                Xóa
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between items-center">
        <span className="font-semibold text-lg">Tổng: {totalPrice.toLocaleString()}₫</span>
        <button
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleCheckout}
        >
          Thanh toán
        </button>
      </div>
    </div>
  );
};

export default Cart;
