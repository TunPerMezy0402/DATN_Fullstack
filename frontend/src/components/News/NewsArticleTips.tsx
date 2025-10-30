import React from "react";
import "./NewsArticleTips.css";

const NewsArticleTips: React.FC = () => {
  const tips = [
    {
      title: "1️⃣ Làm sạch giày thường xuyên",
      desc: "Đừng để bụi bẩn bám lâu ngày, vì nó có thể làm hỏng chất liệu giày. Hãy lau nhẹ bằng khăn ẩm hoặc bàn chải mềm sau mỗi lần sử dụng.",
    },
    {
      title: "2️⃣ Sử dụng dung dịch vệ sinh chuyên dụng",
      desc: "Không nên dùng xà phòng mạnh hoặc chất tẩy rửa thông thường, vì có thể làm phai màu và hư keo giày. Hãy chọn dung dịch dành riêng cho giày thể thao.",
    },
    {
      title: "3️⃣ Phơi giày đúng cách",
      desc: "Sau khi giặt, để giày ở nơi thoáng mát, tránh ánh nắng trực tiếp. Nhiệt độ cao có thể làm bong keo và biến dạng form giày.",
    },
    {
      title: "4️⃣ Khử mùi giày hiệu quả",
      desc: "Đặt túi hút ẩm, gói trà, hoặc baking soda trong giày qua đêm để hút ẩm và khử mùi hôi. Đừng quên vệ sinh lót giày định kỳ.",
    },
    {
      title: "5️⃣ Bảo quản giày khi không sử dụng",
      desc: "Nhét giấy hoặc dùng shoe tree để giữ form giày. Bảo quản ở nơi khô ráo, tránh ẩm mốc. Không chồng nhiều đôi giày lên nhau.",
    },
  ];

  return (
    <div className="news-article-tips">
      <h1>Cách bảo quản giày thể thao đúng cách</h1>

      <div className="news-image-wrapper">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ0JnPGjVaLZxuPqX1AXhJVI6v9yrTqhp16FWCRzA4uTN9XEq0K-ls9r59x0eDakOA0GMw&usqp=CAU"
          alt="Bảo quản giày thể thao"
          className="news-image"
        />
      </div>

      <p>
        Một đôi giày thể thao tốt không chỉ giúp bạn tự tin hơn trong từng bước đi mà còn thể hiện
        phong cách sống năng động. Tuy nhiên, để giày luôn bền đẹp, việc bảo quản đúng cách là vô
        cùng quan trọng. Dưới đây là 5 mẹo đơn giản giúp bạn giữ đôi giày của mình luôn như mới!
      </p>

      <ul>
        {tips.map((tip, index) => (
          <li key={index}>
            <strong>{tip.title}</strong> – {tip.desc}
          </li>
        ))}
      </ul>

      <p>
        Hãy dành chút thời gian chăm sóc giày của bạn sau mỗi lần sử dụng. Một đôi giày sạch đẹp sẽ
        giúp bạn luôn tự tin và phong cách trong mọi hoạt động!
      </p>

      <div className="news-signature">— Mạnh Hùng ❤️</div>
    </div>
  );
};

export default NewsArticleTips;
