<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->boolean('trial_enabled')->default(false)->after('cta');
            $table->unsignedSmallInteger('trial_days')->nullable()->after('trial_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'trial_enabled',
                'trial_days',
            ]);
        });
    }
};
