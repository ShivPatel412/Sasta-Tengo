<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->change();
            $table->dateTime('appointment_date')->nullable()->change();
            $table->json('request_data')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('request_data');
            $table->foreignId('service_id')->nullable(false)->change();
            $table->dateTime('appointment_date')->nullable(false)->change();
        });
    }
};
