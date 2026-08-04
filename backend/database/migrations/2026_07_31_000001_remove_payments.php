<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('appointments', fn (Blueprint $table) => $table->dropColumn('payment_id'));
        Schema::dropIfExists('payments');
    }

    public function down(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('stripe_payment_id')->unique();
            $table->string('stripe_payment_intent')->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('INR');
            $table->string('status');
            $table->timestamps();
        });
        Schema::table('appointments', fn (Blueprint $table) => $table->unsignedBigInteger('payment_id')->nullable());
    }
};
