<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\admin\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    /**
     * Danh sách ticket
     */
    public function index()
    {
        $tickets = SupportTicket::with('user')->orderByDesc('created_at')->paginate(10);

        return response()->json([
            'status' => true,
            'data' => $tickets
        ]);
    }

    /**
     * Chi tiết 1 ticket
     */
    public function show($id)
    {
        $ticket = SupportTicket::with('user')->find($id);

        if (!$ticket) {
            return response()->json([
                'status' => false,
                'message' => 'Support ticket not found'
            ], 404);
        }

        return response()->json([
            'status' => true,
            'data' => $ticket
        ]);
    }

    /**
     * Tạo ticket mới
     */
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'status'  => 'required|string|in:open,closed,pending',
        ]);

        $ticket = SupportTicket::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Support ticket created successfully',
            'data' => $ticket
        ], 201);
    }

    /**
     * Cập nhật ticket
     */
    public function update(Request $request, $id)
    {
        $ticket = SupportTicket::find($id);

        if (!$ticket) {
            return response()->json([
                'status' => false,
                'message' => 'Support ticket not found'
            ], 404);
        }

        $request->validate([
            'subject' => 'sometimes|string|max:255',
            'message' => 'sometimes|string',
            'status'  => 'sometimes|string|in:open,closed,pending',
        ]);

        $ticket->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Support ticket updated successfully',
            'data' => $ticket
        ]);
    }

    /**
     * Xóa ticket
     */
    public function destroy($id)
    {
        $ticket = SupportTicket::find($id);

        if (!$ticket) {
            return response()->json([
                'status' => false,
                'message' => 'Support ticket not found'
            ], 404);
        }

        $ticket->delete();

        return response()->json([
            'status' => true,
            'message' => 'Support ticket deleted successfully'
        ]);
    }
}
