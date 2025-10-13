# Hướng dẫn cấu hình Google OAuth cho ứng dụng

## 1. Tạo Google OAuth Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Chọn **Web application**
6. Thêm **Authorized JavaScript origins**:
   - `http://localhost:3000` (cho development)
   - `https://yourdomain.com` (cho production)
7. Thêm **Authorized redirect URIs**:
   - `http://localhost:3000` (cho development)
   - `https://yourdomain.com` (cho production)

## 2. Cấu hình Environment Variables

### Frontend (.env)
```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
REACT_APP_API_URL=http://localhost:8000/api
```

### Backend (.env)
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# App Configuration
APP_NAME=Laravel
APP_ENV=local
APP_KEY=base64:your_app_key_here
APP_DEBUG=true
APP_URL=http://localhost:8000

# Sanctum Configuration
SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

## 3. Cập nhật Database Migration

Đảm bảo bảng `users` có các cột:
- `google_id` (nullable string)
- `avatar` (nullable string)
- `email_verified_at` (nullable timestamp)

## 4. Các lỗi thường gặp và cách khắc phục

### Lỗi "400 HTTP response code"
- Kiểm tra Google Client ID có đúng không
- Đảm bảo domain được thêm vào Authorized JavaScript origins
- Kiểm tra token có hợp lệ không

### Lỗi "Provider is unable to issue a token"
- Kiểm tra Google OAuth consent screen đã được cấu hình
- Đảm bảo ứng dụng đã được verify (nếu cần)
- Kiểm tra scopes được yêu cầu

### Lỗi "FedCM get() rejects"
- Đây là lỗi của Google Identity Services
- Thử refresh trang hoặc clear browser cache
- Kiểm tra console để xem lỗi chi tiết

## 5. Test Google OAuth

1. Khởi động backend: `php artisan serve`
2. Khởi động frontend: `npm start`
3. Truy cập trang đăng nhập/đăng ký
4. Click nút "Đăng nhập với Google"
5. Kiểm tra console để xem logs

## 6. Debug Tips

- Mở Developer Tools > Console để xem logs
- Kiểm tra Network tab để xem API calls
- Đảm bảo CORS được cấu hình đúng
- Kiểm tra Sanctum configuration

