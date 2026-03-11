<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('login'));
});

test('non-admin users are forbidden', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertForbidden();
});

test('admin users can view the dashboard', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->get(route('admin.dashboard'))
        ->assertOk();
});

test('dashboard returns stats', function () {
    $user = User::factory()->admin()->create();

    $response = $this->actingAs($user)
        ->get(route('admin.dashboard'));

    $stats = $response->original->getData()['page']['props']['stats'];

    expect($stats)
        ->toHaveKeys(['totalTenants', 'totalUsers', 'activeSubscriptions', 'mrr', 'newSignups']);
});

test('dashboard counts exclude admin users', function () {
    $admin = User::factory()->admin()->create();

    User::factory()->count(3)->create();

    $response = $this->actingAs($admin)
        ->get(route('admin.dashboard'));

    $stats = $response->original->getData()['page']['props']['stats'];

    expect($stats['totalUsers'])->toBe(3)
        ->and($stats['totalTenants'])->toBe(3);
});

test('dashboard counts new signups this month', function () {
    $admin = User::factory()->admin()->create();

    User::factory()->count(2)->create();

    $oldUser = User::factory()->create();
    User::query()->whereKey($oldUser->id)->update(['created_at' => now()->subMonths(2)]);

    $response = $this->actingAs($admin)
        ->get(route('admin.dashboard'));

    $stats = $response->original->getData()['page']['props']['stats'];

    expect($stats['newSignups'])->toBe(2)
        ->and($stats['totalTenants'])->toBe(2);
});
