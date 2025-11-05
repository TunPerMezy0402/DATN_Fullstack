import React, { useState, useEffect } from "react";
import { PhoneOutlined, MailOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { message } from "antd";

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

function Contact() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cuộn lên đầu trang
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle nút cuộn
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate
    if (!formData.name || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      message.error("Vui lòng điền đầy đủ thông tin!");
      setLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      message.error("Email không hợp lệ!");
      setLoading(false);
      return;
    }

    // Validate phone (Vietnamese phone format)
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
      message.error("Số điện thoại không hợp lệ!");
      setLoading(false);
      return;
    }

    try {
      // TODO: Gọi API để gửi form liên hệ
      // const response = await api.post('/contact', formData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      message.success("Gửi liên hệ thành công! Chúng tôi sẽ phản hồi sớm nhất có thể.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      message.error("Có lỗi xảy ra! Vui lòng thử lại sau.");
      console.error("Error submitting contact form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-white text-black py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-black">
            Liên Hệ Với Chúng Tôi
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                Thông Tin Liên Hệ
              </h2>

              <div className="space-y-3">
                {/* Address */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="bg-green-100 rounded-full p-2">
                      <EnvironmentOutlined className="text-green-600 text-base" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800 mb-0.5 text-sm">
                      Địa Chỉ
                    </h3>
                    <p className="text-gray-600 text-xs">
                      123 Đường ABC, Phường XYZ
                      <br />
                      Quận 1, TP. Hồ Chí Minh
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="bg-green-100 rounded-full p-2">
                      <PhoneOutlined className="text-green-600 text-base" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800 mb-0.5 text-sm">
                      Điện Thoại
                    </h3>
                    <p className="text-gray-600 text-xs">
                      <a
                        href="tel:+84901234567"
                        className="hover:text-green-600 transition"
                      >
                        0901 234 567
                      </a>
                      <br />
                      <a
                        href="tel:+84987654321"
                        className="hover:text-green-600 transition"
                      >
                        0987 654 321
                      </a>
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="bg-green-100 rounded-full p-2">
                      <MailOutlined className="text-green-600 text-base" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-800 mb-0.5 text-sm">
                      Email
                    </h3>
                    <p className="text-gray-600 text-xs">
                      <a
                        href="mailto:contact@giaydep.com"
                        className="hover:text-green-600 transition"
                      >
                        contact@giaydep.com
                      </a>
                      <br />
                      <a
                        href="mailto:support@giaydep.com"
                        className="hover:text-green-600 transition"
                      >
                        support@giaydep.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-3">
                Gửi Tin Nhắn Cho Chúng Tôi
              </h2>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder="Nhập họ và tên của bạn"
                  />
                </div>

                {/* Email & Phone Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Số Điện Thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                      placeholder="0901 234 567"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tiêu Đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder="Nhập tiêu đề tin nhắn"
                  />
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nội Dung Tin Nhắn <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition resize-none"
                    placeholder="Nhập nội dung tin nhắn của bạn..."
                  />
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang gửi..." : "Gửi Tin Nhắn"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Nút lên đầu trang */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition text-sm font-bold z-50"
          title="Lên đầu trang"
        >
          ↑
        </button>
      )}
    </div>
  );
}

export default Contact;

