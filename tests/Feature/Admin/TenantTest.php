<?php

use App\Models\Tenant;
use App\Models\User;

// --- Index ---

test('guests are redirected to the login page', function () {
    $this->get(route('users.index'))
        ->assertRedirect(route('login'));
});

test('non-admin users are forbidden from the users page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('users.index'))
        ->assertForbidden();
});

test('admin can view the users index', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk();
});

test('users index lists non-admin users', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();

    $response = $this->actingAs($admin)
        ->get(route('users.index'));

    $users = $response->original->getData()['page']['props']['users'];
    $userIds = collect($users['data'] ?? $users)->pluck('id')->all();

    expect($userIds)->toContain($regularUser->id)
        ->and($userIds)->not->toContain($admin->id);
});

// --- Show ---

test('admin can view a user detail page', function () {
    $admin = User::factory()->admin()->create();
    $tenant = Tenant::factory()->create();
    $user = User::factory()->create(['tenant_id' => $tenant->id]);

    $this->actingAs($admin)
        ->get(route('users.show', $user))
        ->assertOk();
});

test('non-admin users are forbidden from viewing user details', function () {
    $user = User::factory()->create();
    $target = User::factory()->create();

    $this->actingAs($user)
        ->get(route('users.show', $target))
        ->assertForbidden();
});

test('user show returns tenant and user data', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();

    $response = $this->actingAs($admin)
        ->get(route('users.show', $regularUser->id));

    $props = $response->original->getData()['page']['props'];

    expect($props['tenant']['id'])->toBe($regularUser->tenant_id)
        ->and($props['user']['name'])->toBe($regularUser->name)
        ->and($props['user']['email'])->toBe($regularUser->email);
});

// --- Destroy (Deactivate) ---

test('admin can deactivate a user', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $tenantId = $regularUser->tenant_id;
    $userId = $regularUser->id;

    $this->actingAs($admin)
        ->delete(route('users.destroy', $userId))
        ->assertRedirect(route('users.index'));

    expect(Tenant::find($tenantId))->toBeNull()
        ->and(Tenant::withTrashed()->find($tenantId))->not->toBeNull();
});

test('admin cannot deactivate another admin user', function () {
    $admin = User::factory()->admin()->create();
    $otherAdmin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->delete(route('users.destroy', $otherAdmin->id))
        ->assertForbidden();

    expect(Tenant::find($otherAdmin->tenant_id))->not->toBeNull();
});

test('deactivating a user soft-deletes the user', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();

    $this->actingAs($admin)
        ->delete(route('users.destroy', $regularUser->id));

    expect(User::find($regularUser->id))->toBeNull()
        ->and(User::withTrashed()->find($regularUser->id))->not->toBeNull();
});

// --- Restore ---

test('admin can restore a deactivated user', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $tenantId = $regularUser->tenant_id;
    $userId = $regularUser->id;

    $regularUser->tenant->delete();
    $regularUser->delete();

    $this->actingAs($admin)
        ->post(route('users.restore', $userId))
        ->assertRedirect(route('users.show', $userId));

    expect(Tenant::find($tenantId))->not->toBeNull();
});

test('restoring a user also restores the user', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $tenantId = $regularUser->tenant_id;
    $userId = $regularUser->id;

    $regularUser->tenant->delete();
    $regularUser->delete();

    $this->actingAs($admin)
        ->post(route('users.restore', $userId));

    expect(User::find($userId))->not->toBeNull();
});

// --- Force Destroy ---

test('admin can permanently delete a deactivated user', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $tenantId = $regularUser->tenant_id;
    $userId = $regularUser->id;

    $regularUser->tenant->delete();
    $regularUser->delete();

    $this->actingAs($admin)
        ->delete(route('users.force-destroy', $userId), [
            'password' => 'password',
        ])
        ->assertRedirect(route('users.index'));

    expect(Tenant::withTrashed()->find($tenantId))->toBeNull();
});

test('force destroy requires correct password', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $tenantId = $regularUser->tenant_id;
    $userId = $regularUser->id;

    $regularUser->tenant->delete();
    $regularUser->delete();

    $this->actingAs($admin)
        ->delete(route('users.force-destroy', $userId), [
            'password' => 'wrong-password',
        ])
        ->assertSessionHasErrors('password');

    expect(Tenant::withTrashed()->find($tenantId))->not->toBeNull();
});

test('force destroy requires a password', function () {
    $admin = User::factory()->admin()->create();
    $regularUser = User::factory()->create();
    $userId = $regularUser->id;

    $regularUser->tenant->delete();
    $regularUser->delete();

    $this->actingAs($admin)
        ->delete(route('users.force-destroy', $userId), [
            'password' => '',
        ])
        ->assertSessionHasErrors('password');
});

test('admin cannot force-delete an admin user', function () {
    $admin = User::factory()->admin()->create();
    $otherAdmin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->delete(route('users.force-destroy', $otherAdmin->id), [
            'password' => 'password',
        ])
        ->assertForbidden();
});
