#!/bin/bash

# Banner API Test Script
# Chạy script này để test các API Banner

BASE_URL="http://localhost:8000/api"
TOKEN=""

echo "🚀 Bắt đầu test Banner API..."
echo "=================================="

# Bước 1: Đăng nhập để lấy token
echo "📝 Bước 1: Đăng nhập..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }')

echo "Login Response: $LOGIN_RESPONSE"

# Extract token từ response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Không thể lấy token. Vui lòng kiểm tra thông tin đăng nhập."
    echo "💡 Tạo admin user: php artisan db:seed --class=AdminUserSeeder"
    exit 1
fi

echo "✅ Token: $TOKEN"
echo ""

# Bước 2: Test tạo banner
echo "📝 Bước 2: Tạo banner mới..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/admin/banners \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Banner - Giảm giá 50%",
    "is_active": true
  }')

echo "Create Response: $CREATE_RESPONSE"
echo ""

# Bước 3: Test lấy danh sách banner
echo "📝 Bước 3: Lấy danh sách banner..."
LIST_RESPONSE=$(curl -s -X GET $BASE_URL/admin/banners \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "List Response: $LIST_RESPONSE"
echo ""

# Bước 4: Test client API - lấy banner active
echo "📝 Bước 4: Test client API - lấy banner active..."
CLIENT_RESPONSE=$(curl -s -X GET $BASE_URL/banners/active \
  -H "Accept: application/json")

echo "Client Response: $CLIENT_RESPONSE"
echo ""

# Bước 5: Test tạo banner thứ 2 để test logic active
echo "📝 Bước 5: Tạo banner thứ 2 để test logic active..."
CREATE_RESPONSE2=$(curl -s -X POST $BASE_URL/admin/banners \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Banner 2 - Sản phẩm mới",
    "is_active": true
  }')

echo "Create Banner 2 Response: $CREATE_RESPONSE2"
echo ""

# Bước 6: Kiểm tra lại danh sách để xem logic active
echo "📝 Bước 6: Kiểm tra logic active..."
LIST_RESPONSE2=$(curl -s -X GET $BASE_URL/admin/banners \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "List After Create Banner 2: $LIST_RESPONSE2"
echo ""

echo "✅ Test hoàn thành!"
echo "=================================="
echo "📋 Các API đã được test:"
echo "  - POST /api/auth/login"
echo "  - POST /api/admin/banners"
echo "  - GET /api/admin/banners"
echo "  - GET /api/banners/active"
echo ""
echo "💡 Để test thêm các API khác, hãy xem file BANNER_API_TEST_GUIDE.md"
