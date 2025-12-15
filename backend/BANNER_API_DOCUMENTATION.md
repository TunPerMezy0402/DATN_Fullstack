# Banner API Documentation

## Tổng quan
API Banner cung cấp các chức năng quản lý banner cho cả admin và client.

## Admin APIs (Yêu cầu authentication)

### 1. Danh sách Banner
```
GET /api/admin/banners
```

**Query Parameters:**
- `is_active` (boolean): Lọc theo trạng thái active
- `with_trashed` (boolean): Bao gồm các banner đã xóa
- `search` (string): Tìm kiếm theo title
- `per_page` (integer): Số lượng item per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Banner Title",
      "is_active": true,
      "created_at": "2025-01-27T10:00:00.000000Z",
      "updated_at": "2025-01-27T10:00:00.000000Z",
      "images_count": 3,
      "images": [...]
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### 2. Xem chi tiết Banner
```
GET /api/admin/banners/{id}
```

**Response:**
```json
{
  "id": 1,
  "title": "Banner Title",
  "is_active": true,
  "created_at": "2025-01-27T10:00:00.000000Z",
  "updated_at": "2025-01-27T10:00:00.000000Z",
  "images": [...]
}
```

### 3. Tạo Banner mới
```
POST /api/admin/banners
```

**Request Body:**
```json
{
  "title": "Banner Title",
  "is_active": true
}
```

**Validation Rules:**
- `title`: required, string, max:255
- `is_active`: sometimes, boolean

**Response:** 201 Created
```json
{
  "id": 1,
  "title": "Banner Title",
  "is_active": true,
  "created_at": "2025-01-27T10:00:00.000000Z",
  "updated_at": "2025-01-27T10:00:00.000000Z",
  "images": []
}
```

**Lưu ý:** Khi tạo banner với `is_active = true`, tất cả banner khác sẽ tự động được set `is_active = false`.

### 4. Cập nhật Banner
```
PUT /api/admin/banners/{id}
```

**Request Body:**
```json
{
  "title": "Updated Banner Title",
  "is_active": true
}
```

**Validation Rules:**
- `title`: sometimes, string, max:255
- `is_active`: sometimes, boolean

**Response:**
```json
{
  "id": 1,
  "title": "Updated Banner Title",
  "is_active": true,
  "created_at": "2025-01-27T10:00:00.000000Z",
  "updated_at": "2025-01-27T10:00:00.000000Z",
  "images": [...]
}
```

**Lưu ý:** Khi cập nhật banner với `is_active = true`, tất cả banner khác sẽ tự động được set `is_active = false`.

### 5. Xóa mềm Banner
```
DELETE /api/admin/banners/{id}
```

**Response:** 204 No Content

### 6. Danh sách Banner đã xóa
```
GET /api/admin/banners/trash
```

**Query Parameters:**
- `search` (string): Tìm kiếm theo title
- `per_page` (integer): Số lượng item per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Deleted Banner",
      "is_active": false,
      "created_at": "2025-01-27T10:00:00.000000Z",
      "updated_at": "2025-01-27T10:00:00.000000Z",
      "deleted_at": "2025-01-27T11:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### 7. Khôi phục Banner
```
POST /api/admin/banners/{id}/restore
```

**Response:**
```json
{
  "id": 1,
  "title": "Restored Banner",
  "is_active": false,
  "created_at": "2025-01-27T10:00:00.000000Z",
  "updated_at": "2025-01-27T10:00:00.000000Z",
  "deleted_at": null
}
```

### 8. Xóa vĩnh viễn Banner
```
DELETE /api/admin/banners/{id}/force
```

**Response:** 204 No Content

## Client APIs (Không yêu cầu authentication)

### 1. Lấy Banner đang hoạt động
```
GET /api/banners/active
```

**Response:** 200 OK
```json
{
  "data": {
    "id": 1,
    "title": "Active Banner",
    "is_active": true,
    "created_at": "2025-01-27T10:00:00.000000Z",
    "updated_at": "2025-01-27T10:00:00.000000Z",
    "images": [
      {
        "id": 1,
        "banner_id": 1,
        "image_url": "path/to/image.jpg",
        "is_active": true,
        "sort_order": 1,
        "created_at": "2025-01-27T10:00:00.000000Z",
        "updated_at": "2025-01-27T10:00:00.000000Z"
      }
    ]
  },
  "message": "Active banner retrieved successfully"
}
```

**Response:** 404 Not Found (khi không có banner active)
```json
{
  "message": "No active banner found"
}
```

### 2. Danh sách Banner cho Client
```
GET /api/banners
```

**Query Parameters:**
- `is_active` (boolean): Lọc theo trạng thái active
- `search` (string): Tìm kiếm theo title
- `per_page` (integer): Số lượng item per page (default: 10)

**Response:**
```json
{
  "data": {
    "data": [
      {
        "id": 1,
        "title": "Banner Title",
        "is_active": true,
        "created_at": "2025-01-27T10:00:00.000000Z",
        "updated_at": "2025-01-27T10:00:00.000000Z",
        "images": [...]
      }
    ],
    "links": {...},
    "meta": {...}
  },
  "message": "Banners retrieved successfully"
}
```

## Error Responses

### Validation Error (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."]
  }
}
```

### Not Found Error (404)
```json
{
  "message": "No query results for model [App\\Models\\Banner] {id}"
}
```

### Unauthorized Error (401)
```json
{
  "message": "Unauthenticated."
}
```

## Authentication
- Admin APIs yêu cầu Bearer token trong header: `Authorization: Bearer {token}`
- Client APIs không yêu cầu authentication

## Database Schema

### Banners Table
```sql
CREATE TABLE banners (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL
);
```

## Business Logic
1. **Chỉ một banner có thể active tại một thời điểm**: Khi set `is_active = true` cho một banner, tất cả banner khác sẽ tự động được set `is_active = false`.

2. **Soft Delete**: Banner được xóa mềm, có thể khôi phục lại.

3. **Banner Images**: Mỗi banner có thể có nhiều hình ảnh, được sắp xếp theo `sort_order`.
