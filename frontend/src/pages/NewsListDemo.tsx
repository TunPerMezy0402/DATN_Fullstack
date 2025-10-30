import React from "react";
import "./NewsListDemo.css";

const NewsListDemo: React.FC = () => {
  return (
    <div className="news-intro-container">
      <div className="news-header">
        <img
          src="https://vlpfashion.com/wp-content/uploads/2021/10/cac-hang-giay-the-thao-noi-tieng.jpg"
          alt="Giày Thời Trang"
          className="news-banner"
        />
        <h1 className="news-title">Chào mừng bạn đến với chuyên mục Tin Tức Giày!</h1>
      </div>

      <div className="news-content">
        <p className="news-paragraph">
          Chúng tôi rất vui được đồng hành cùng bạn trong hành trình khám phá thế giới giày dép – nơi mà phong cách, cá tính
          và sự thoải mái hòa quyện trong từng bước chân. Tại đây, bạn sẽ luôn cập nhật được những xu hướng thời trang giày mới nhất,
          những mẹo chăm sóc giày hữu ích, cũng như câu chuyện đầy cảm hứng đằng sau từng thương hiệu.
        </p>

        <p className="news-paragraph">
          Năm 2025 đánh dấu sự trở lại mạnh mẽ của phong cách tối giản, bền vững và thân thiện với môi trường.
          Những đôi giày không chỉ là món phụ kiện thời trang mà còn là lời khẳng định về lối sống có ý thức của người dùng.
          Chúng tôi tin rằng, mỗi đôi giày đều kể một câu chuyện riêng – về hành trình, trải nghiệm và cả những bước tiến trong phong cách sống hiện đại.
        </p>

        <div className="news-image-wrapper">
          <img
            src="https://www.nicekicks.com/files/2023/10/air-jordan-reimagined-series.jpg"
            alt="Giày phong cách"
            className="news-image"
          />
        </div>

        <p className="news-paragraph">
          Hãy cùng chúng tôi khám phá những bài viết thú vị, từ xu hướng giày thể thao, giày da cao cấp cho đến các sản phẩm thủ công độc đáo.
          Đội ngũ biên tập của chúng tôi luôn nỗ lực mang đến nội dung chất lượng, giúp bạn chọn lựa được những đôi giày phù hợp nhất với cá tính
          và nhu cầu của mình.
        </p>

        <p className="news-paragraph">
          Cảm ơn bạn đã tin tưởng và đồng hành cùng chúng tôi trong suốt thời gian qua.
          Chúc bạn luôn tự tin, năng động và tràn đầy cảm hứng trên mọi hành trình!
        </p>

        <div className="news-signature">— Nguyễn Mạnh Hùng ❤️</div>
      </div>
    </div>
  );
};

export default NewsListDemo;
