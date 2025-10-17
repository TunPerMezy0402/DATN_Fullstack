<?php
namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    // Hiển thị danh sách người dùng (có phân trang + search)
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('search') && $request->search != '') {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        // Lọc theo trạng thái nếu có
        if ($request->has('status') && in_array($request->status, ['active', 'inactive'])) {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users);
    }

    // Lưu người dùng mới
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:user,admin',
            'phone' => 'required|string|max:15|unique:users,phone',
            'status' => 'in:active,inactive',
        ]);

        $user = new User();
        $user->name = $validated['name'];
        $user->address = $validated['address'] ?? null;
        $user->email = $validated['email'];
        $user->password = Hash::make($validated['password']); // ✅ hash password
        $user->role = $validated['role'];
        $user->phone = $validated['phone'];
        $user->status = $validated['status'] ?? 'active';
        $user->save();

        return response()->json([
            'message' => 'Người dùng mới đã được thêm!',
            'user' => $user
        ], 201);
    }

    // Hiển thị chi tiết người dùng
    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    // Cập nhật người dùng (bao gồm cả status và password)
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:15|unique:users,phone,' . $user->id,
            'role' => 'sometimes|in:user,admin',
            'status' => 'sometimes|in:active,inactive',
            'password' => 'sometimes|string|min:8', // ✅ cho phép cập nhật mật khẩu
        ]);

        // Gán dữ liệu mới
        $user->fill($validated);

        // ✅ Nếu có mật khẩu mới thì hash lại
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Cập nhật người dùng thành công!',
            'user' => $user
        ]);
    }
}
