// src/layouts/partials/Header.tsx
import { useState } from 'react';
import '../../../../assets/admin/css/Header.css';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    {
      icon: 'fa-file-alt',
      color: 'primary',
      title: 'Báo cáo mới đã được tạo',
      date: '12/12/2024',
    },
    {
      icon: 'fa-donate',
      color: 'success',
      title: 'Đơn hàng mới: $290.29',
      date: '12/07/2024',
    },
    {
      icon: 'fa-exclamation-triangle',
      color: 'warning',
      title: 'Cảnh báo: Tài khoản cần xác minh',
      date: '12/02/2024',
    },
  ];

  const messages = [
    {
      avatar: 'https://i.pravatar.cc/60?img=1',
      name: 'Emily Fowler',
      message: 'Xin chào! Có vấn đề gì cần hỗ trợ không?',
      time: '58 phút',
      status: 'online',
    },
    {
      avatar: 'https://i.pravatar.cc/60?img=2',
      name: 'Jae Chun',
      message: 'Tôi có câu hỏi về sản phẩm mới...',
      time: '1 giờ',
      status: 'away',
    },
    {
      avatar: 'https://i.pravatar.cc/60?img=3',
      name: 'Morgan Alvarez',
      message: 'Bạn đã nhận được đơn hàng chưa?',
      time: '2 giờ',
      status: 'offline',
    },
  ];

  return (
    <header className="header">
      <div className="header__container">
        {/* Left Section */}
        <div className="header__left">
          {/* Mobile Toggle */}
          <button
            className="header__toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* Search Bar - Desktop */}
          <form className="header__search header__search--desktop">
            <div className="header__search-wrapper">
              <i className="fas fa-search header__search-icon"></i>
              <input
                type="text"
                className="header__search-input"
                placeholder="Tìm kiếm..."
                aria-label="Search"
              />
              <button type="submit" className="header__search-btn">
                Tìm
              </button>
            </div>
          </form>
        </div>

        {/* Right Section */}
        <div className="header__right">
          {/* Search Icon - Mobile */}
          <div className="header__item header__item--mobile-search">
            <button
              className="header__icon-btn"
              onClick={() => setShowSearchMobile(!showSearchMobile)}
              aria-label="Search"
            >
              <i className="fas fa-search"></i>
            </button>
            {showSearchMobile && (
              <div className="header__dropdown header__dropdown--search">
                <form className="header__search-mobile">
                  <input
                    type="text"
                    className="header__search-input"
                    placeholder="Tìm kiếm..."
                  />
                  <button type="submit" className="header__search-btn">
                    <i className="fas fa-search"></i>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="header__item">
            <button
              className="header__icon-btn"
              onClick={() => setShowAlerts(!showAlerts)}
              aria-label="Notifications"
            >
              <i className="fas fa-bell"></i>
              <span className="header__badge">3</span>
            </button>
            {showAlerts && (
              <>
                <div
                  className="header__overlay"
                  onClick={() => setShowAlerts(false)}
                />
                <div className="header__dropdown">
                  <div className="header__dropdown-header">
                    <h6 className="header__dropdown-title">Thông báo</h6>
                    <span className="header__dropdown-count">3 mới</span>
                  </div>
                  <div className="header__dropdown-body">
                    {notifications.map((notif, idx) => (
                      <a key={idx} href="#" className="header__dropdown-item">
                        <div className={`header__notif-icon header__notif-icon--${notif.color}`}>
                          <i className={`fas ${notif.icon}`}></i>
                        </div>
                        <div className="header__notif-content">
                          <p className="header__notif-title">{notif.title}</p>
                          <span className="header__notif-date">{notif.date}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                  <a href="#" className="header__dropdown-footer">
                    Xem tất cả thông báo
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="header__item">
            <button
              className="header__icon-btn"
              onClick={() => setShowMessages(!showMessages)}
              aria-label="Messages"
            >
              <i className="fas fa-envelope"></i>
              <span className="header__badge header__badge--danger">7</span>
            </button>
            {showMessages && (
              <>
                <div
                  className="header__overlay"
                  onClick={() => setShowMessages(false)}
                />
                <div className="header__dropdown header__dropdown--messages">
                  <div className="header__dropdown-header">
                    <h6 className="header__dropdown-title">Tin nhắn</h6>
                    <span className="header__dropdown-count">7 mới</span>
                  </div>
                  <div className="header__dropdown-body">
                    {messages.map((msg, idx) => (
                      <a key={idx} href="#" className="header__message-item">
                        <div className="header__message-avatar">
                          <img src={msg.avatar} alt={msg.name} />
                          <span className={`header__status header__status--${msg.status}`}></span>
                        </div>
                        <div className="header__message-content">
                          <div className="header__message-header">
                            <span className="header__message-name">{msg.name}</span>
                            <span className="header__message-time">{msg.time}</span>
                          </div>
                          <p className="header__message-text">{msg.message}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                  <a href="#" className="header__dropdown-footer">
                    Xem tất cả tin nhắn
                  </a>
                </div>
              </>
            )}
          </div>

          <div className="header__divider"></div>

          {/* User Profile */}
          <div className="header__item">
            <button
              className="header__profile-btn"
              onClick={() => setShowProfile(!showProfile)}
              aria-label="User Menu"
            >
              <span className="header__profile-name">Admin User</span>
              <img
                className="header__profile-img"
                src="https://i.pravatar.cc/60?img=10"
                alt="Profile"
              />
            </button>
            {showProfile && (
              <>
                <div
                  className="header__overlay"
                  onClick={() => setShowProfile(false)}
                />
                <div className="header__dropdown header__dropdown--profile">
                  <div className="header__profile-info">
                    <img
                      className="header__profile-avatar"
                      src="https://i.pravatar.cc/60?img=10"
                      alt="Profile"
                    />
                    <div>
                      <p className="header__profile-title">Admin User</p>
                      <span className="header__profile-email">admin@example.com</span>
                    </div>
                  </div>
                  <div className="header__dropdown-divider"></div>
                  <a href="#" className="header__dropdown-link">
                    <i className="fas fa-user"></i>
                    <span>Tài khoản</span>
                  </a>
                  <a href="#" className="header__dropdown-link">
                    <i className="fas fa-cogs"></i>
                    <span>Cài đặt</span>
                  </a>
                  <a href="#" className="header__dropdown-link">
                    <i className="fas fa-list"></i>
                    <span>Nhật ký hoạt động</span>
                  </a>
                  <div className="header__dropdown-divider"></div>
                  <a href="#" className="header__dropdown-link header__dropdown-link--danger">
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Đăng xuất</span>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;