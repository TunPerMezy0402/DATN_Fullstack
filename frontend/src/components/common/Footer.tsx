
import logo from "../../assets/client/logo/logo.png";

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-green-100 via-white to-green-100 text-gray-700 border-t border-gray-200 mt-10 py-6">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:justify-between md:items-start gap-10 md:gap-0">
        {/* Logo & Mô tả */}
        <div className="flex flex-col items-center md:items-start md:w-1/4 space-y-4 mr-6">
          <img
            src={logo}
            alt="Velora Shoes"
            className="w-16 h-16 rounded-sm ml-24"
            style={{ minWidth: "64px", minHeight: "64px" }}
          />
          <p className="text-[13px] text-center md:text-left leading-relaxed max-w-xs text-gray-600">
            Velora – nơi bạn tìm thấy những đôi giày thời trang, chất lượng, phù hợp cho mọi phong cách.
          </p>
        </div>

        {/* Liên kết */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:w-3/4">
          {/* Danh mục */}
          <div>
            <h3 className="text-gray-700 font-medium text-lg mb-4 border-b border-gray-200 pb-2">
              Danh mục
            </h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Giày puma</li>
              <li>Giày sneaker nữ</li>
              <li>Giày sneaker nam</li>
              <li>Giày nike</li>
              <li>Giày adidas</li>
            </ul>
          </div>

          {/* Công ty */}
          <div>
            <h3 className="text-gray-700 font-medium text-lg mb-4 border-b border-gray-200 pb-2">
              Công ty
            </h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Về chúng tôi</li>
              <li>Chính sách giao hàng</li>
              <li>Điều khoản sử dụng</li>
              <li>Thanh toán an toàn</li>
              <li>Liên hệ</li>
            </ul>
          </div>

          {/* Tài khoản */}
          <div>
            <h3 className="text-gray-700 font-medium text-lg mb-4 border-b border-gray-200 pb-2">
              Tài khoản
            </h3>
            <ul className="space-y-2 text-sm text-gray-500">
              <li>Đăng nhập</li>
              <li>Giỏ hàng</li>
              <li>Chính sách đổi trả</li>
              <li>Trở thành đối tác</li>
              <li>Chương trình cộng tác viên</li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h3 className="text-gray-700 font-medium text-lg mb-4 border-b border-gray-200 pb-2">
              Liên hệ
            </h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="flex items-start space-x-2">
                <i className="fas fa-map-marker-alt text-green-500 mt-1 text-sm"></i>
                <span>86 Đội Cấn, P. Liễu Giai, Q. Ba Đình, Hà Nội</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fab fa-whatsapp text-green-500 text-sm"></i>
                <span>+87 8888 907</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fas fa-envelope text-green-500 text-sm"></i>
                <span>support@velora.vn</span>
              </li>
              <li className="flex space-x-2">
                {["facebook-f", "twitter", "linkedin-in", "instagram"].map(
                  (icon, i) => (
                    <a
                      key={i}
                      href="#"
                      className="w-6 h-6 flex items-center justify-center bg-gray-700 text-white rounded text-xs"
                    >
                      <i className={`fab fa-${icon}`}></i>
                    </a>
                  )
                )}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Thanh dưới */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400">
          <p className="mb-2 sm:mb-0">
            © {new Date().getFullYear()}{" "}
            <a className="text-green-500 hover:underline" href="#">
              Velora Shoes
            </a>{" "}
            - Tất cả bản quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
