<?php

use App\Models\AppSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Mail\WelcomeRegisteredMail;
use Illuminate\Support\Facades\Mail;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('a tenant is created when a user registers', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'test@example.com')->first();

    expect($user->tenant_id)->not->toBeNull();
    expect(Tenant::find($user->tenant_id))->not->toBeNull();
});

test('the tenant has a user relationship back to the registered user', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'test@example.com')->first();

    expect($user->tenant->user->id)->toBe($user->id);
});

test('newly registered user receives welcome email when enabled', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', true);
    AppSetting::setValue('emails_welcome_enabled', true);

    $this->post(route('register.store'), [
        'name' => 'Welcome User',
        'email' => 'welcome@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    Mail::assertSent(WelcomeRegisteredMail::class, function (WelcomeRegisteredMail $mail) {
        return $mail->hasTo('welcome@example.com');
    });
});

test('newly registered user does not receive welcome email when disabled', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', true);
    AppSetting::setValue('emails_welcome_enabled', false);

    $this->post(route('register.store'), [
        'name' => 'No Welcome User',
        'email' => 'no-welcome@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect(route('dashboard', absolute: false));

    Mail::assertNotSent(WelcomeRegisteredMail::class);
});
