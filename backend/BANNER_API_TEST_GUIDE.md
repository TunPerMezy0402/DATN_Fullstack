# Hướng dẫn Test Banner API

## 🚀 Bước 1: Khởi động Server

Server Laravel đã được khởi động tại: `http://localhost:8000`

## 🔐 Bước 2: Test Authentication (Admin APIs)

### Đăng nhập để lấy token
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com"
  },
  "token": "1|abc123def456..."
}
```

**Lưu token này để sử dụng cho các request admin!**

## 📋 Bước 3: Test Admin APIs

### 3.1. Tạo Banner mới
```bash
curl -X POST http://localhost:8000/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Banner Chính",
    "is_active": true
  }'
```

### 3.2. Tạo Banner thứ 2 (không active)
```bash
curl -X POST http://localhost:8000/api/admin/banners \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Banner Phụ",
    "is_active": false
  }'
```

### 3.3. Lấy danh sách Banner
```bash
curl -X GET http://localhost:8000/api/admin/banners \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.4. Lấy danh sách với filter
```bash
# Chỉ lấy banner active
curl -X GET "http://localhost:8000/api/admin/banners?is_active=true" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Tìm kiếm theo title
curl -X GET "http://localhost:8000/api/admin/banners?search=Banner" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.5. Xem chi tiết Banner
```bash
curl -X GET http://localhost:8000/api/admin/banners/1 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.6. Cập nhật Banner
```bash
curl -X PUT http://localhost:8000/api/admin/banners/2 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Banner Phụ - Đã cập nhật",
    "is_active": true
  }'
```

**Lưu ý:** Sau khi cập nhật banner 2 với `is_active: true`, banner 1 sẽ tự động chuyển thành `is_active: false`

### 3.7. Xóa mềm Banner
```bash
curl -X DELETE http://localhost:8000/api/admin/banners/2 \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.8. Xem danh sách Banner đã xóa
```bash
curl -X GET http://localhost:8000/api/admin/banners/trash \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.9. Khôi phục Banner
```bash
curl -X POST http://localhost:8000/api/admin/banners/2/restore \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3.10. Xóa vĩnh viễn Banner
```bash
curl -X DELETE http://localhost:8000/api/admin/banners/2/force \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🌐 Bước 4: Test Client APIs (Không cần authentication)

### 4.1. Lấy Banner đang hoạt động
```bash
curl -X GET http://localhost:8000/api/banners/active \
  -H "Accept: application/json"
```

### 4.2. Lấy tất cả Banner
```bash
curl -X GET http://localhost:8000/api/banners \
  -H "Accept: application/json"
```

### 4.3. Lấy Banner với filter
```bash
# Chỉ lấy banner active
curl -X GET "http://localhost:8000/api/banners?is_active=true" \
  -H "Accept: application/json"

# Tìm kiếm theo title
curl -X GET "http://localhost:8000/api/banners?search=Banner" \
  -H "Accept: application/json"
```

## 🧪 Bước 5: Test với Postman

### Import Collection vào Postman:

1. **Tạo Environment:**
   - `base_url`: `http://localhost:8000/api`
   - `token`: `YOUR_TOKEN_HERE`

2. **Tạo các request:**

#### Admin Requests:
- **POST** `{{base_url}}/auth/login` - Đăng nhập
- **GET** `{{base_url}}/admin/banners` - Danh sách banner
- **POST** `{{base_url}}/admin/banners` - Tạo banner
- **GET** `{{base_url}}/admin/banners/1` - Chi tiết banner
- **PUT** `{{base_url}}/admin/banners/1` - Cập nhật banner
- **DELETE** `{{base_url}}/admin/banners/1` - Xóa banner
- **GET** `{{base_url}}/admin/banners/trash` - Banner đã xóa
- **POST** `{{base_url}}/admin/banners/1/restore` - Khôi phục
- **DELETE** `{{base_url}}/admin/banners/1/force` - Xóa vĩnh viễn

#### Client Requests:
- **GET** `{{base_url}}/banners/active` - Banner active
- **GET** `{{base_url}}/banners` - Tất cả banner

## 🔍 Bước 6: Test Cases Quan Trọng

### Test Case 1: Logic Active Banner
1. Tạo banner A với `is_active: true`
2. Tạo banner B với `is_active: true`
3. Kiểm tra banner A có `is_active: false` không
4. Kiểm tra banner B có `is_active: true` không

### Test Case 2: Soft Delete
1. Tạo banner
2. Xóa mềm banner
3. Kiểm tra banner không xuất hiện trong danh sách chính
4. Kiểm tra banner xuất hiện trong trash
5. Khôi phục banner
6. Kiểm tra banner xuất hiện lại trong danh sách chính

### Test Case 3: Validation
1. Test tạo banner không có title (should fail)
2. Test tạo banner với title quá dài (should fail)
3. Test cập nhật với dữ liệu không hợp lệ

### Test Case 4: Authentication
1. Test admin APIs không có token (should fail)
2. Test admin APIs với token sai (should fail)
3. Test client APIs không cần token (should work)

## 📊 Bước 7: Kiểm tra Database

```bash
# Vào database
cd backend
php artisan tinker

# Kiểm tra banner
App\Models\Banner::all()
App\Models\Banner::withTrashed()->get()
App\Models\Banner::onlyTrashed()->get()
```

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **401 Unauthorized**: Kiểm tra token có đúng không
2. **422 Validation Error**: Kiểm tra dữ liệu gửi lên
3. **404 Not Found**: Kiểm tra ID banner có tồn tại không
4. **500 Server Error**: Kiểm tra log trong `storage/logs/laravel.log`

### Debug Commands:
```bash
# Xem log
tail -f backend/storage/logs/laravel.log

# Clear cache
cd backend
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Kiểm tra routes
php artisan route:list --path=api
```

## ✅ Checklist Test

- [ ] Server chạy thành công
- [ ] Authentication hoạt động
- [ ] Tạo banner thành công
- [ ] Logic active banner hoạt động đúng
- [ ] CRUD operations hoạt động
- [ ] Soft delete hoạt động
- [ ] Restore hoạt động
- [ ] Force delete hoạt động
- [ ] Client APIs hoạt động
- [ ] Validation hoạt động
- [ ] Error handling hoạt động
