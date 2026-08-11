<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('category', 80)->default('web')->change();
        });
    }

    public function down(): void
    {
        // Keep text storage so a rollback cannot destroy custom type values.
    }
};
