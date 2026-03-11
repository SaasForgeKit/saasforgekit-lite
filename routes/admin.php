<?php

use App\Http\Controllers\Admin\AppSettingsController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\StripePriceController;
use App\Http\Controllers\Admin\StripePricingController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Middleware\EnsureAdmin;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth', EnsureAdmin::class])
    ->prefix('admin')
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('admin.dashboard');

        Route::resource('users', UserController::class)
            ->only(['index', 'show', 'destroy']);

        Route::post('users/{user}/restore', [UserController::class, 'restore'])
            ->name('users.restore');

        Route::delete('users/{user}/force', [UserController::class, 'forceDestroy'])
            ->name('users.force-destroy');

        Route::resource('pricing', StripePricingController::class)
            ->parameters(['pricing' => 'id']);

        Route::post('pricing/reorder', [StripePricingController::class, 'reorder'])
            ->name('pricing.reorder');

        Route::post('pricing/{id}/features', [StripePricingController::class, 'updateFeatures'])
            ->name('pricing.features.update');

        Route::post('pricing/{id}/prices', [StripePriceController::class, 'store'])
            ->name('pricing.prices.store');

        Route::put('prices/{id}', [StripePriceController::class, 'update'])
            ->name('prices.update');

        Route::delete('prices/{id}', [StripePriceController::class, 'destroy'])
            ->name('prices.destroy');

        Route::redirect('settings', '/admin/settings/general');
        Route::get('settings/general', [AppSettingsController::class, 'edit'])->name('admin.settings.general');
        Route::post('settings/general', [AppSettingsController::class, 'update'])->name('admin.settings.update');
        Route::get('settings/emails', [AppSettingsController::class, 'editEmails'])->name('admin.settings.emails');
        Route::post('settings/emails', [AppSettingsController::class, 'updateEmails'])->name('admin.settings.emails.update');
        Route::get('settings/social-auth', [AppSettingsController::class, 'editSocialAuth'])->name('admin.settings.social-auth');
        Route::post('settings/social-auth', [AppSettingsController::class, 'updateSocialAuth'])->name('admin.settings.social-auth.update');
    });
