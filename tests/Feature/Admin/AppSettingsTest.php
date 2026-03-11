<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('guests are redirected to the login page', function () {
    $this->get(route('admin.settings.general'))
        ->assertRedirect(route('login'));
});

test('non-admin users are forbidden', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.settings.general'))
        ->assertForbidden();
});

test('admin users can view the settings page', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->get(route('admin.settings.general'))
        ->assertOk();
});

test('settings page returns current settings', function () {
    $user = User::factory()->admin()->create();

    AppSetting::setValue('app_name', 'My Custom App');

    $response = $this->actingAs($user)
        ->get(route('admin.settings.general'));

    $response->assertOk();

    $settings = $response->original->getData()['page']['props']['settings'];
    expect($settings['app_name'])->toBe('My Custom App');
});

test('settings page falls back to config app name when no db value exists', function () {
    $user = User::factory()->admin()->create();

    $response = $this->actingAs($user)
        ->get(route('admin.settings.general'));

    $settings = $response->original->getData()['page']['props']['settings'];
    expect($settings['app_name'])->toBe(config('app.name'));
});

test('admin can update the app name', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'New App Name',
        ])
        ->assertRedirect();

    expect(AppSetting::getValue('app_name'))->toBe('New App Name');
});

test('app name is required', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => '',
        ])
        ->assertSessionHasErrors('app_name');
});

test('app name cannot exceed 255 characters', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => str_repeat('a', 256),
        ])
        ->assertSessionHasErrors('app_name');
});

test('admin can upload a logo', function () {
    Storage::fake('public');

    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        ])
        ->assertRedirect();

    $logoPath = AppSetting::getValue('logo');
    expect($logoPath)->not->toBeNull();
    Storage::disk('public')->assertExists($logoPath);
});

test('admin can upload a favicon', function () {
    Storage::fake('public');

    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'favicon' => UploadedFile::fake()->image('favicon.png', 32, 32),
        ])
        ->assertRedirect();

    $faviconPath = AppSetting::getValue('favicon');
    expect($faviconPath)->not->toBeNull();
    Storage::disk('public')->assertExists($faviconPath);
});

test('uploading a new logo removes the old one', function () {
    Storage::fake('public');

    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'logo' => UploadedFile::fake()->image('logo-old.png'),
        ]);

    $oldPath = AppSetting::getValue('logo');
    Storage::disk('public')->assertExists($oldPath);

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'logo' => UploadedFile::fake()->image('logo-new.png'),
        ]);

    Storage::disk('public')->assertMissing($oldPath);

    $newPath = AppSetting::getValue('logo');
    expect($newPath)->not->toBe($oldPath);
    Storage::disk('public')->assertExists($newPath);
});

test('admin can remove the logo', function () {
    Storage::fake('public');

    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'logo' => UploadedFile::fake()->image('logo.png'),
        ]);

    $logoPath = AppSetting::getValue('logo');
    Storage::disk('public')->assertExists($logoPath);

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'remove_logo' => true,
        ])
        ->assertRedirect();

    expect(AppSetting::getValue('logo'))->toBeNull();
    Storage::disk('public')->assertMissing($logoPath);
});

test('admin can remove the favicon', function () {
    Storage::fake('public');

    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'favicon' => UploadedFile::fake()->image('favicon.png', 32, 32),
        ]);

    $faviconPath = AppSetting::getValue('favicon');
    Storage::disk('public')->assertExists($faviconPath);

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'remove_favicon' => true,
        ])
        ->assertRedirect();

    expect(AppSetting::getValue('favicon'))->toBeNull();
    Storage::disk('public')->assertMissing($faviconPath);
});

test('logo validation rejects non-image files', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'logo' => UploadedFile::fake()->create('document.pdf', 100),
        ])
        ->assertSessionHasErrors('logo');
});

test('favicon validation rejects non-image files', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Test App',
            'favicon' => UploadedFile::fake()->create('document.pdf', 100),
        ])
        ->assertSessionHasErrors('favicon');
});

test('non-admin users cannot update settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.settings.update'), [
            'app_name' => 'Hacked',
        ])
        ->assertForbidden();

    expect(AppSetting::getValue('app_name'))->toBeNull();
});

test('admin can view social auth settings page', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get(route('admin.settings.social-auth'))
        ->assertOk();
});

test('admin cannot enable unconfigured social providers', function () {
    $admin = User::factory()->admin()->create();

    config([
        'services.google.client_id' => null,
        'services.google.client_secret' => null,
        'services.google.redirect' => null,
    ]);

    $this->actingAs($admin)
        ->post(route('admin.settings.social-auth.update'), [
            'social_auth_enabled' => true,
            'social_enabled_providers' => ['google'],
        ])
        ->assertSessionHasErrors('social_enabled_providers');
});

test('admin can enable configured social providers', function () {
    $admin = User::factory()->admin()->create();

    config([
        'services.google.client_id' => 'google-client-id',
        'services.google.client_secret' => 'google-client-secret',
        'services.google.redirect' => 'https://example.test/auth/google/callback',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.settings.social-auth.update'), [
            'social_auth_enabled' => true,
            'social_enabled_providers' => ['google'],
        ])
        ->assertRedirect();

    expect(AppSetting::getBoolean('social_auth_enabled', false))->toBeTrue()
        ->and(json_decode((string) AppSetting::getValue('social_enabled_providers', '[]'), true))
        ->toBe(['google']);
});
