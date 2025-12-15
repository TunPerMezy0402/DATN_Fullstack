<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
       // create_banners_table
    Schema::create('banners', function (Blueprint $table) {
	$table->id();
	$table->string('title', 255);
	$table->boolean('is_active')->default(false);
	$table->timestamps();
	$table->softDeletes();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('banners');
    }
};
