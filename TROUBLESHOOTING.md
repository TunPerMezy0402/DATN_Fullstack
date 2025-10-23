# Hướng dẫn khắc phục lỗi kết nối API

## Lỗi hiện tại
```
AxiosError {message: 'Network Error', name: 'AxiosError', code: 'ERR_NETWORK'}
GET http://127.0.0.1:8000/api/ net::ERR_CONNECTION_REFUSED
```

## Nguyên nhân
Backend Laravel server chưa được khởi động hoặc không chạy trên port 8000.

## Cách khắc phục

### 1. Khởi động Backend Server
```bash
# Di chuyển vào thư mục backend
cd backend

# Khởi động Laravel development server
php artisan serve

# Hoặc chỉ định host và port cụ thể
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Kiểm tra server có chạy không
Mở trình duyệt và truy cập: `http://127.0.0.1:8000/api/`

Hoặc sử dụng PowerShell:
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -Method GET
```

### 3. Kiểm tra port có bị chiếm dụng không
```bash
# Windows
netstat -ano | findstr :8000

# Nếu có process đang sử dụng port 8000, kill nó
taskkill /PID <PID_NUMBER> /F
```

### 4. Cài đặt dependencies (nếu cần)
```bash
cd backend
composer install
```

### 5. Chạy migrations (nếu cần)
```bash
cd backend
php artisan migrate
```

### 6. Kiểm tra CORS configuration
File `backend/config/cors.php` đã được cập nhật để hỗ trợ:
- `http://localhost:3000` (React default)
- `http://127.0.0.1:3000` (React IP)
- `http://localhost:5173` (Vite dev server)
- `http://127.0.0.1:5173` (Vite dev server)

## API Endpoint
- **URL**: `http://127.0.0.1:8000/api/`
- **Method**: GET
- **Response**: JSON với `categories` và `products`

## Cấu trúc Response
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Category Name",
      "image_url": "http://127.0.0.1:8000/storage/category-image.jpg"
    }
  ],
  "products": [...]
}
```

## Lưu ý
- Đảm bảo cả frontend và backend đều chạy đồng thời
- Frontend thường chạy trên port 3000 hoặc 5173 (Vite)
- Backend chạy trên port 8000
- Kiểm tra firewall có chặn port 8000 không

