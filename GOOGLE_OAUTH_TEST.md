# Hướng dẫn Test Google OAuth

## Các bước để test Google OAuth

### 1. Cấu hình Environment Variables

Tạo file `.env` trong thư mục `frontend`:
```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
REACT_APP_API_URL=http://localhost:8000/api
```

Tạo file `.env` trong thư mục `backend`:
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

### 2. Khởi động ứng dụng

```bash
# Backend
cd backend
php artisan serve

# Frontend (terminal mới)
cd frontend
npm start
```

### 3. Test Google OAuth

1. Truy cập `http://localhost:3000/login`
2. Kiểm tra console để xem logs:
   - `✅ Google OAuth initialized`
   - `✅ Google button rendered`
3. Click nút Google để test đăng nhập
4. Kiểm tra Network tab để xem API calls

### 4. Debug các lỗi thường gặp

#### Lỗi "Google Client ID is not configured"
- Kiểm tra file `.env` có đúng không
- Restart frontend server sau khi thay đổi `.env`

#### Lỗi "Token không khớp với ứng dụng"
- Kiểm tra `GOOGLE_CLIENT_ID` trong backend `.env`
- Đảm bảo Client ID giống nhau ở frontend và backend

#### Lỗi "FedCM get() rejects"
- Đây là lỗi của Google Identity Services
- Thử refresh trang hoặc clear browser cache
- Kiểm tra domain có được thêm vào Authorized JavaScript origins

#### Lỗi CORS
- Kiểm tra `SANCTUM_STATEFUL_DOMAINS` trong backend `.env`
- Đảm bảo frontend URL được thêm vào

### 5. Kiểm tra Database

Đảm bảo bảng `users` có các cột:
- `google_id` (nullable string)
- `avatar` (nullable string) 
- `email_verified_at` (nullable timestamp)

### 6. Logs để theo dõi

**Frontend Console:**
- `✅ Google OAuth initialized`
- `✅ Google button rendered`
- `✅ Google login successful:`
- `❌ Google login error:`

**Backend Logs:**
- Kiểm tra Laravel logs trong `storage/logs/laravel.log`
- Xem response từ Google API

### 7. Test Cases

1. **Đăng nhập với Google (user mới):**
   - Click Google button
   - Chọn Google account
   - Kiểm tra user được tạo trong database
   - Kiểm tra redirect đến dashboard

2. **Đăng nhập với Google (user đã tồn tại):**
   - Click Google button với account đã đăng ký
   - Kiểm tra user được cập nhật
   - Kiểm tra redirect đến dashboard

3. **Đăng ký với Google:**
   - Truy cập `/register`
   - Click Google button
   - Kiểm tra user được tạo
   - Kiểm tra redirect đến login page

### 8. Troubleshooting

Nếu vẫn gặp lỗi:
1. Kiểm tra Google Cloud Console:
   - Authorized JavaScript origins
   - Authorized redirect URIs
   - OAuth consent screen
2. Clear browser cache và cookies
3. Thử trên browser khác
4. Kiểm tra network connectivity
