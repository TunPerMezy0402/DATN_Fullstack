import React from "react";
import "./NewsArticleReview.css";

const NewsArticleReview: React.FC = () => {
  const trends = [
    {
      title: "Sneaker cổ điển trở lại mạnh mẽ",
      desc: "Các mẫu sneaker cổ điển như Nike Air Force 1, Adidas Samba, hay New Balance 550 tiếp tục được ưa chuộng nhờ phong cách retro tinh tế.",
    },
    {
      title: "Công nghệ vật liệu tái chế",
      desc: "Năm 2025 chứng kiến sự bùng nổ của sneaker thân thiện với môi trường, khi nhiều thương hiệu áp dụng vật liệu tái chế trong sản xuất.",
    },
    {
      title: "Thiết kế hầm hố, đế dày lên ngôi",
      desc: "Xu hướng chunky sneaker (đế dày) vẫn tiếp tục thống trị, mang lại cảm giác mạnh mẽ và cá tính cho người mang.",
    },
    {
      title: "Sneaker kết hợp thời trang cao cấp",
      desc: "Sự hợp tác giữa các hãng thể thao và thương hiệu thời trang xa xỉ như Gucci x Adidas hay Dior x Nike tiếp tục tạo cơn sốt.",
    },
    {
      title: "Màu pastel & tone trung tính",
      desc: "Gam màu nhẹ nhàng, tự nhiên giúp sneaker dễ phối đồ và phù hợp với nhiều phong cách.",
    },
  ];

  return (
    <div className="news-article-review">
      <h1>Xu hướng giày sneaker 2025</h1>

      <div className="news-image-wrapper">
        <img
          src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"
          alt="Xu hướng sneaker 2025"
          className="news-image"
        />
      </div>

      <p>
        Năm 2025 đánh dấu sự thay đổi lớn trong ngành công nghiệp giày sneaker. 
        Không chỉ là sản phẩm thể thao, sneaker giờ đây đã trở thành biểu tượng của thời trang và phong cách sống.
      </p>

      <ul>
        {trends.map((item, index) => (
          <li key={index}>
            <strong>{item.title}</strong> – {item.desc}
          </li>
        ))}
      </ul>

      <p>
        Từ những thiết kế cổ điển đến các công nghệ tiên tiến, sneaker năm 2025 chắc chắn sẽ tiếp tục là xu hướng được yêu thích trên toàn cầu.
      </p>

      <div className="news-signature">— Mạnh Hùng</div>
    </div>
  );
};

export default NewsArticleReview;
