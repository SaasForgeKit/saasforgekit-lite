<?php

use App\Models\AppSetting;
use App\Models\SocialAccount;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

function configureGoogleProvider(): void
{
    AppSetting::setValue('social_auth_enabled', true);
    AppSetting::setValue('social_enabled_providers', json_encode(['google']));

    config([
        'services.google.client_id' => 'google-client-id',
        'services.google.client_secret' => 'google-client-secret',
        'services.google.redirect' => 'https://example.test/auth/google/callback',
    ]);
}

test('users can view connected accounts settings page', function () {
    configureGoogleProvider();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('settings.connected-accounts'))
        ->assertOk();
});

test('users can link a provider from settings', function () {
    configureGoogleProvider();

    $user = User::factory()->create();

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-linked-1',
        'name' => 'Linked User',
        'email' => $user->email,
    ]));

    $this->actingAs($user)
        ->withSession([
            'social_auth_intent' => 'link',
            'social_auth_provider' => 'google',
        ])
        ->get(route('social-auth.callback', ['provider' => 'google']))
        ->assertRedirect(route('settings.connected-accounts'));

    $this->assertDatabaseHas('social_accounts', [
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_user_id' => 'google-linked-1',
    ]);
});

test('users cannot link an account already linked to another user', function () {
    configureGoogleProvider();

    $existingLinkedUser = User::factory()->create();
    SocialAccount::factory()->create([
        'user_id' => $existingLinkedUser->id,
        'provider' => 'google',
        'provider_user_id' => 'google-shared',
    ]);

    $user = User::factory()->create();

    Socialite::fake('google', (new SocialiteUser)->map([
        'id' => 'google-shared',
        'name' => 'Conflict',
        'email' => $user->email,
    ]));

    $this->actingAs($user)
        ->withSession([
            'social_auth_intent' => 'link',
            'social_auth_provider' => 'google',
        ])
        ->get(route('social-auth.callback', ['provider' => 'google']))
        ->assertRedirect(route('settings.connected-accounts'));

    $this->assertDatabaseMissing('social_accounts', [
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_user_id' => 'google-shared',
    ]);
});

test('users can unlink their provider', function () {
    configureGoogleProvider();

    $user = User::factory()->create();
    SocialAccount::factory()->create([
        'user_id' => $user->id,
        'provider' => 'google',
    ]);

    $this->actingAs($user)
        ->delete(route('settings.connected-accounts.destroy', ['provider' => 'google']))
        ->assertRedirect(route('settings.connected-accounts'));

    $this->assertDatabaseMissing('social_accounts', [
        'user_id' => $user->id,
        'provider' => 'google',
    ]);
});

test('legacy settings callback route forwards to unified social callback', function () {
    configureGoogleProvider();

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->get(route('settings.connected-accounts.callback', [
            'provider' => 'google',
            'code' => 'oauth-code',
            'state' => 'oauth-state',
        ]));

    $response->assertRedirect(route('social-auth.callback', [
        'provider' => 'google',
        'code' => 'oauth-code',
        'state' => 'oauth-state',
    ]));
});
