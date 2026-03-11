<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->unsignedBigInteger('owner_id')->nullable()->after('name');
            $table->foreign('owner_id')->references('id')->on('users')->nullOnDelete();
        });

        $tenantIds = DB::table('tenants')->pluck('id');

        foreach ($tenantIds as $tenantId) {
            $owner = DB::table('users')
                ->where('tenant_id', $tenantId)
                ->orderBy('id')
                ->first(['id', 'name']);

            $displayName = $owner && is_string($owner->name) && $owner->name !== ''
                ? "{$owner->name}'s Account"
                : "Account {$tenantId}";

            DB::table('tenants')
                ->where('id', $tenantId)
                ->update([
                    'name' => $displayName,
                    'owner_id' => $owner?->id,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['owner_id']);
            $table->dropColumn(['name', 'owner_id']);
        });
    }
};
