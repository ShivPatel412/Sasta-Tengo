<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_types', function (Blueprint $table) {
            $table->string('category', 80)->nullable()->unique()->after('name');
        });

        DB::table('project_types')->whereNull('category')->orderBy('id')->eachById(function ($type) {
            DB::table('project_types')->where('id', $type->id)->update(['category' => $type->name]);
        });

        foreach ([
            'web' => 'Web Application',
            'desktop' => 'Desktop Application',
            'mobile' => 'Mobile Application',
            'other' => 'Other',
        ] as $category => $name) {
            DB::table('project_types')->updateOrInsert(
                ['name' => $name],
                ['category' => $category, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('project_types', function (Blueprint $table) {
            $table->dropUnique(['category']);
            $table->dropColumn('category');
        });
    }
};
