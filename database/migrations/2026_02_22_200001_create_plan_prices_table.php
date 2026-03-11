<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
            $table->string('stripe_id')->unique();
            $table->integer('unit_amount');
            $table->string('currency', 3);
            $table->string('interval');
            $table->integer('interval_count')->default(1);
            $table->string('nickname')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('stripe_created_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_prices');
    }
};
