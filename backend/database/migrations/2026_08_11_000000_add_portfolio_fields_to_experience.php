<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('experience', function (Blueprint $table) {
            $table->string('logo')->nullable()->after('company');
            $table->string('website')->nullable()->after('logo');
            $table->text('summary')->nullable()->after('description');
            $table->json('highlights')->nullable()->after('summary');
        });
    }

    public function down(): void
    {
        Schema::table('experience', fn (Blueprint $table) => $table->dropColumn(['logo', 'website', 'summary', 'highlights']));
    }
};
