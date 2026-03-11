<?php

declare(strict_types=1);

use App\Http\Controllers\BillingController;
use App\Http\Controllers\TaskController;
use App\Http\Middleware\EnsureSubscribed;
use App\Http\Middleware\InitializeTenancyByUser;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Routes that require an authenticated user with an active tenant.
| The InitializeTenancyByUser middleware sets the tenant context
| based on the authenticated user's tenant_id.
|
*/

Route::middleware(['web', 'auth', InitializeTenancyByUser::class])->group(function () {
    Route::get('/billing', [BillingController::class, 'index'])->name('billing');
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');

    Route::middleware(EnsureSubscribed::class)->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('dashboard');
        })->name('dashboard');

        Route::resource('tasks', TaskController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });
});
