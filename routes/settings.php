<?php

use App\Http\Controllers\Settings\ConnectedAccountsController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::get('settings/connected-accounts', [ConnectedAccountsController::class, 'index'])
        ->name('settings.connected-accounts');
    Route::get('settings/connected-accounts/{provider}/redirect', [ConnectedAccountsController::class, 'redirect'])
        ->name('settings.connected-accounts.redirect');
    Route::get('settings/connected-accounts/{provider}/callback', [ConnectedAccountsController::class, 'callback'])
        ->name('settings.connected-accounts.callback');
    Route::delete('settings/connected-accounts/{provider}', [ConnectedAccountsController::class, 'destroy'])
        ->name('settings.connected-accounts.destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('user-password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance.edit');

    Route::get('settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');
});
