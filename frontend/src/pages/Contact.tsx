export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-xl p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Liên hệ với chúng tôi</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Info */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Thông tin liên hệ</h2>
            <ul className="space-y-2 text-gray-600">
              <li>📍 <strong>Địa chỉ:</strong> Trịnh Văn Bô - Bắc Từ Liêm - Hà Nội</li>
              <li>📞 <strong>Số điện thoại:</strong> 0395656428</li>
              <li>✉️ <strong>Email:</strong> chicfeet@gmail.com</li>
            </ul>
          </div>

          {/* Form */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Gửi tin nhắn</h2>
            <form className="space-y-3">
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Họ tên" />
              <input className="w-full px-3 py-2 border rounded-lg" type="email" placeholder="Email" />
              <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Nội dung"></textarea>
              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                Gửi liên hệ
              </button>
            </form>
          </div>
        </div>

        {/* Map */}
        <h2 className="text-lg font-semibold text-center mb-3">Bản đồ</h2>

        <div className="w-full h-80 rounded-lg overflow-hidden shadow">
          <iframe
            title="map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.848283240154!2d105.82215777565544!3d21.03813268061356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab77244a7e13%3A0xa35e7f7bcac28cf!2zQ2jDuWEgQuG7mWMsIMSQ4buTbmcgxJDDgA!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
            width="100%"
            height="100%"
            loading="lazy"
            className="border-0"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
