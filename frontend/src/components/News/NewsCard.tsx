import React from "react";
import { useNavigate } from "react-router-dom";
import "./NewsCard.css";

type NewsCardProps = {
  id: string;
  title: string;
  image: string;
  description: string;
  date?: string;
};

const NewsCard: React.FC<NewsCardProps> = ({ id, title, image, description, date }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/news/${id}`);
  };

  return (
    <div className="news-card" onClick={handleClick}>
      <div className="news-card-image">
        <img src={image} alt={title} />
      </div>

      <div className="news-card-content">
        <h3 className="news-card-title">{title}</h3>
        {date && <p className="news-card-date">{date}</p>}
        <p className="news-card-desc">{description}</p>

        <button className="news-card-btn">Xem chi tiết</button>
      </div>
    </div>
  );
};

export default NewsCard;
