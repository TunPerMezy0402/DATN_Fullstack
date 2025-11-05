# Hướng dẫn Test Banner API - Phiên bản Windows

## 🚀 Bước 1: Khởi động Server

```powershell
cd backend
php artisan serve
```

Server sẽ chạy tại: `http://localhost:8000`

## 🔐 Bước 2: Tạo Admin User (nếu chưa có)

```powershell
php artisan db:seed --class=AdminUserSeeder
```

Hoặc tạo user admin thủ công:
```powershell
php artisan tinker
```

Trong tinker:
```php
App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@example.com',
    'password' => bcrypt('password'),
    'role' => 'admin'
]);
```

## 🧪 Bước 3: Test với Postman (Khuyến nghị)

### 3.1. Tạo Environment trong Postman:
- `base_url`: `http://localhost:8000/api`
- `token`: (để trống, sẽ điền sau)

### 3.2. Tạo Collection "Banner API Test"

#### Request 1: Login
- **Method**: POST
- **URL**: `{{base_url}}/auth/login`
- **Body** (raw JSON):
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```
- **Headers**: 
  - `Content-Type`: `application/json`
  - `Accept`: `application/json`

**Sau khi chạy, copy token từ response và paste vào environment variable `token`**

#### Request 2: Tạo Banner
- **Method**: POST
- **URL**: `{{base_url}}/admin/banners`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Accept`: `application/json`
  - `Authorization`: `Bearer {{token}}`
- **Body** (raw JSON):
```json
{
  "title": "Banner Test - Giảm giá 50%",
  "is_active": true
}
```

#### Request 3: Lấy danh sách Banner
- **Method**: GET
- **URL**: `{{base_url}}/admin/banners`
- **Headers**:
  - `Accept`: `application/json`
  - `Authorization`: `Bearer {{token}}`

#### Request 4: Lấy Banner Active (Client)
- **Method**: GET
- **URL**: `{{base_url}}/banners/active`
- **Headers**:
  - `Accept`: `application/json`

## 🖥️ Bước 4: Test với PowerShell (Alternative)

### 4.1. Đăng nhập và lấy token:
```powershell
$loginData = @{
    email = "admin@example.com"
    password = "password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Token: $token"
```

### 4.2. Tạo Banner:
```powershell
$bannerData = @{
    title = "Banner Test PowerShell"
    is_active = $true
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$createResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/banners" -Method POST -Body $bannerData -Headers $headers
Write-Host "Created Banner: $($createResponse | ConvertTo-Json)"
```

### 4.3. Lấy danh sách Banner:
```powershell
$listResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/admin/banners" -Method GET -Headers $headers
Write-Host "Banner List: $($listResponse | ConvertTo-Json)"
```

### 4.4. Test Client API:
```powershell
$clientResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/banners/active" -Method GET -ContentType "application/json"
Write-Host "Active Banner: $($clientResponse | ConvertTo-Json)"
```

## 🌐 Bước 5: Test với Browser (Chỉ Client APIs)

Mở browser và truy cập:
- `http://localhost:8000/api/banners/active`
- `http://localhost:8000/api/banners`

## 📊 Bước 6: Kiểm tra Database

```powershell
php artisan tinker
```

Trong tinker:
```php
// Xem tất cả banner
App\Models\Banner::all()

// Xem banner active
App\Models\Banner::active()->get()

// Xem banner đã xóa
App\Models\Banner::onlyTrashed()->get()
```

## 🧪 Test Cases Quan Trọng

### Test Case 1: Logic Active Banner
1. Tạo banner A với `is_active: true`
2. Tạo banner B với `is_active: true`
3. Kiểm tra banner A có `is_active: false`
4. Kiểm tra banner B có `is_active: true`

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

## 🐛 Troubleshooting

### Lỗi thường gặp:

1. **401 Unauthorized**: 
   - Kiểm tra token có đúng không
   - Kiểm tra user có role admin không

2. **422 Validation Error**: 
   - Kiểm tra dữ liệu gửi lên
   - Kiểm tra Content-Type header

3. **404 Not Found**: 
   - Kiểm tra URL có đúng không
   - Kiểm tra ID banner có tồn tại không

4. **500 Server Error**: 
   - Kiểm tra log: `tail -f storage/logs/laravel.log`
   - Clear cache: `php artisan cache:clear`

### Debug Commands:
```powershell
# Xem log
Get-Content storage/logs/laravel.log -Tail 20

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Kiểm tra routes
php artisan route:list --path=api
```

## ✅ Checklist Test

- [ ] Server chạy thành công
- [ ] Admin user tồn tại
- [ ] Authentication hoạt động
- [ ] Tạo banner thành công
- [ ] Logic active banner hoạt động đúng
- [ ] CRUD operations hoạt động
- [ ] Soft delete hoạt động
- [ ] Client APIs hoạt động
- [ ] Validation hoạt động

## 📝 Ghi chú

- **Admin APIs** yêu cầu Bearer token trong header
- **Client APIs** không yêu cầu authentication
- Chỉ một banner có thể active tại một thời điểm
- Banner được xóa mềm, có thể khôi phục
