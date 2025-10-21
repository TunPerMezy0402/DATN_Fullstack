<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\AddressBook;
use Illuminate\Http\Request;

class AddressBookController extends Controller
{
    /**
     * Danh sách địa chỉ
     */
    public function index()
    {
        $addresses = AddressBook::with('user')->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $addresses
        ]);
    }

    /**
     * Chi tiết địa chỉ
     */
    public function show($id)
    {
        $address = AddressBook::with('user')->find($id);

        if (!$address) {
            return response()->json([
                'status' => false,
                'message' => 'Address not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $address
        ]);
    }

    /**
     * Tạo mới địa chỉ
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id'        => 'required|integer',
            'recipient_name' => 'required|string|max:255',
            'phone'          => 'required|string|max:20',
            'address_line'   => 'required|string|max:255',
            'city'           => 'required|string|max:100',
            'state'          => 'nullable|string|max:100',
            'country'        => 'required|string|max:100',
            'zip_code'       => 'nullable|string|max:20',
            'is_default'     => 'boolean',
        ]);

        // Nếu địa chỉ này là default thì reset các địa chỉ khác của user
        if ($request->is_default) {
            AddressBook::where('user_id', $request->user_id)->update(['is_default' => 0]);
        }

        $address = AddressBook::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Address created successfully',
            'data' => $address
        ], 201);
    }

    /**
     * Cập nhật địa chỉ
     */
    public function update(Request $request, $id)
    {
        $address = AddressBook::find($id);

        if (!$address) {
            return response()->json([
                'status' => false,
                'message' => 'Address not found'
            ], 404);
        }

        $request->validate([
            'recipient_name' => 'sometimes|string|max:255',
            'phone'          => 'sometimes|string|max:20',
            'address_line'   => 'sometimes|string|max:255',
            'city'           => 'sometimes|string|max:100',
            'state'          => 'nullable|string|max:100',
            'country'        => 'sometimes|string|max:100',
            'zip_code'       => 'nullable|string|max:20',
            'is_default'     => 'boolean',
        ]);

        if ($request->has('is_default') && $request->is_default) {
            AddressBook::where('user_id', $address->user_id)->update(['is_default' => 0]);
        }

        $address->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Address updated successfully',
            'data' => $address
        ]);
    }

    /**
     * Xóa địa chỉ
     */
    public function destroy($id)
    {
        $address = AddressBook::find($id);

        if (!$address) {
            return response()->json([
                'status' => false,
                'message' => 'Address not found'
            ], 404);
        }

        $address->delete();

        return response()->json([
            'status' => true,
            'message' => 'Address deleted successfully'
        ]);

        //  $address->delete();

        // return response()->json([
        //     'status' => true,
        //     'message' => 'Address deleted successfully'
        // ]);
    }
}
