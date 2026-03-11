<?php

use App\Models\AppSetting;
use App\Models\SocialAccount;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

function enableSocialProvider(string $provider): void
{
    AppSetting::setValue('social_auth_enabled', true);
    AppSetting::setValue('social_enabled_providers', json_encode([$provider]));

    config([
        "services.{$provider}.client_id" => "{$provider}-client-id",
        "services.{$provider}.client_secret" => "{$provider}-client-secret",
        "services.{$provider}.redirect" => "https://example.test/auth/{$provider}/callback",
    ]);
}

test('users are redirected to enabled provider', function () {
    enableSocialProvider('google');
    Socialite::fake('google');

    $response = $this->get(route('social-auth.redirect', ['provider' => 'google']));

    $response->assertRedirect();
});

test('disabled providers cannot be used for redirect', function () {
    $response = $this->get(route('social-auth.redirect', ['provider' => 'google']));

    $response->assertRedirect(route('login'));
});

test('existing linked users can login with social callback', function () {
    enableSocialProvider('google');

    $user = User::factory()->create();
    SocialAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_user_id' => 'google-123',
    ]);

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-123',
        'name' => 'Taylor Otwell',
        'email' => $user->email,
    ]));

    $response = $this->get(route('social-auth.callback', ['provider' => 'google']));

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticatedAs($user);
});

test('social callback blocks existing password users when not linked', function () {
    enableSocialProvider('google');

    $existingUser = User::factory()->create([
        'email' => 'existing@example.com',
    ]);

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-456',
        'name' => $existingUser->name,
        'email' => 'existing@example.com',
    ]));

    $response = $this->get(route('social-auth.callback', ['provider' => 'google']));

    $response->assertRedirect(route('login'));
    $this->assertGuest();
    $this->assertDatabaseMissing('social_accounts', [
        'provider' => 'google',
        'provider_user_id' => 'google-456',
    ]);
});

test('social callback creates a new user tenant and social account', function () {
    enableSocialProvider('google');

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-789',
        'name' => 'New Social User',
        'email' => 'new-social@example.com',
    ]));

    $response = $this->get(route('social-auth.callback', ['provider' => 'google']));

    $response->assertRedirect(route('dashboard', absolute: false));

    $user = User::query()->where('email', 'new-social@example.com')->first();
    expect($user)->not->toBeNull()
        ->and($user->tenant_id)->not->toBeNull();

    $this->assertDatabaseHas('social_accounts', [
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_user_id' => 'google-789',
    ]);
});
