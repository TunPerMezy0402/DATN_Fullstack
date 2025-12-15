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
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (!Schema::hasColumn('notifications', 'created_at')) {
                    $table->timestamp('created_at')->nullable()->after('is_read');
                }
                if (!Schema::hasColumn('notifications', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('created_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (Schema::hasColumn('notifications', 'updated_at')) {
                    $table->dropColumn('updated_at');
                }
                if (Schema::hasColumn('notifications', 'created_at')) {
                    $table->dropColumn('created_at');
                }
            });
        }
    }
};
