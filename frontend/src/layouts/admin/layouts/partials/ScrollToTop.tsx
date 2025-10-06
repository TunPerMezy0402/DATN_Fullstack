// src/layouts/partials/ScrollToTop.tsx
import { useState, useEffect } from 'react';
import '../../../../assets/admin/css/ScrollToTop.css'; // CSS tùy chỉnh


const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Hiển thị button khi scroll xuống
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Scroll smooth lên đầu trang
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      className={`scroll-to-top-btn ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Lên đầu trang"
    >
      <i className="bi bi-arrow-up"></i>
    </button>
  );
};

export default ScrollToTop;