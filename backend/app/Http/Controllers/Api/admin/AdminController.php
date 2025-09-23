<?php

namespace App\Http\Controllers\Api\admin;


class AdminController extends Controller
{
    public function index() {
        return view('admin.index');
    }
}
