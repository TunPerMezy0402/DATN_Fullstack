<?php

/* use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\HomeController;

use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AttributeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CategoryController;

Auth::routes();

Route::get('/', function () {
    return view('home');
});

Route::get('/home', [HomeController::class, 'index'])->name('home');


Route::get('/admin', [AdminController::class, 'index'])->middleware(['auth', 'admin'])->name('admin.index');

Route::macro('adminResource', function ($prefix, $controller) {
    Route::prefix($prefix)->middleware(['auth', 'admin'])->name(str_replace('/', '.', $prefix) . '.')->group(function () use ($controller, $prefix) {
        Route::get('/trash', [$controller, 'trash'])->name('trash');
        Route::get('/create', [$controller, 'create'])->name('create');
        Route::post('/{id}/restore', [$controller, 'restore'])->name('restore');
        Route::delete('/{id}/force-delete', [$controller, 'forceDelete'])->name('forceDelete');
        Route::get('/{id}/edit', [$controller, 'edit'])->name('edit');
        Route::get('/{id}', [$controller, 'show'])->name('show');
        Route::put('/{id}', [$controller, 'update'])->name('update');
        Route::delete('/{id}', [$controller, 'destroy'])->name('destroy');
        Route::get('/', [$controller, 'index'])->name('index');
        Route::post('/', [$controller, 'store'])->name('store');
    });
});

Route::adminResource('admin/users', UserController::class);
Route::adminResource('admin/products', ProductController::class);
Route::adminResource('admin/categories', CategoryController::class);
Route::adminResource('admin/attributes', AttributeController::class);


Route::prefix('admin/cinemas')->middleware(['auth', 'admin'])->name('admin.cinemas.')->group(function () {

}); */
