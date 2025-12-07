<?php
namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    // Hiển thị danh sách người dùng (phân trang + tìm kiếm)
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('status') && in_array($request->status, ['active', 'inactive'])) {
            $query->where('status', $request->status);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users);
    }

    // Lưu người dùng mới
    public function store(Request $request)
    {
        $validated = $request->validate(
            [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'role' => 'required|in:user,admin',
                'phone' => 'required|string|max:15|unique:users,phone',
                'status' => 'in:active,inactive',
            ],
            [
                'name.required' => 'Tên không được để trống.',
                'email.required' => 'Email không được để trống.',
                'email.email' => 'Email không hợp lệ.',
                'email.unique' => 'Email đã tồn tại.',
                'password.required' => 'Mật khẩu không được để trống.',
                'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
                'role.required' => 'Vui lòng chọn vai trò.',
                'role.in' => 'Vai trò không hợp lệ.',
                'phone.required' => 'Số điện thoại không được để trống.',
                'phone.unique' => 'Số điện thoại đã được sử dụng.',
                'status.in' => 'Trạng thái không hợp lệ.',
            ]
        );

        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = Hash::make($validated['password']);
        $user->role = $validated['role'];
        $user->phone = $validated['phone'];
        $user->status = $validated['status'] ?? 'active';
        $user->save();

        return response()->json([
            'message' => 'Thêm người dùng thành công!',
            'user' => $user
        ], 201);
    }

    // Hiển thị chi tiết người dùng
    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    // Cập nhật người dùng
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate(
            [
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|string|max:15|unique:users,phone,' . $user->id,
                'role' => 'sometimes|in:user,admin',
                'status' => 'sometimes|in:active,inactive',
                'password' => 'sometimes|string|min:8',
            ],
            [
                'name.string' => 'Tên không hợp lệ.',
                'phone.unique' => 'Số điện thoại đã được sử dụng.',
                'role.in' => 'Vai trò không hợp lệ.',
                'status.in' => 'Trạng thái không hợp lệ.',
                'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            ]
        );

        $user->fill($validated);

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
