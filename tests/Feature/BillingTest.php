<?php

use App\Listeners\StripeEventListener;
use App\Mail\InvoicePaidMail;
use App\Mail\PaymentFailedMail;
use App\Mail\SubscriptionActivatedMail;
use App\Models\AppSetting;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Laravel\Cashier\Events\WebhookReceived;

test('billing page loads for authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('billing'))
        ->assertOk();
});

test('billing page loads for user with cancelled subscription', function () {
    $user = User::factory()->cancelledSubscription()->create();

    $response = $this->actingAs($user)
        ->get(route('billing'));

    $response->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['subscription']['stripe_status'])->toBe('canceled')
        ->and($props['subscription']['active'])->toBeFalse()
        ->and($props['plans'])->toBeArray();
});

test('billing page with session_id handles stripe failure gracefully for cancelled subscription', function () {
    $user = User::factory()->cancelledSubscription()->create();

    $response = $this->actingAs($user)
        ->get(route('billing', ['session_id' => 'cs_test_nonexistent']));

    $response->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['subscription']['stripe_status'])->toBe('canceled')
        ->and($props['plans'])->toBeArray();
});

test('cancelled subscription can be updated in place without creating duplicates', function () {
    $user = User::factory()->cancelledSubscription()->create();
    $tenant = Tenant::find($user->tenant_id);

    $oldSub = $tenant->subscription();
    $oldSubId = $oldSub->id;

    expect($oldSub->stripe_status)->toBe('canceled');

    $oldSub->items()->delete();
    $oldSub->update([
        'type' => 'default',
        'stripe_id' => 'sub_new_resubscribe',
        'stripe_status' => 'active',
        'stripe_price' => 'price_new_monthly',
        'quantity' => 1,
        'ends_at' => null,
    ]);

    $oldSub->items()->create([
        'stripe_id' => 'si_new_item',
        'stripe_product' => 'prod_starter',
        'stripe_price' => 'price_new_monthly',
        'quantity' => 1,
    ]);

    $tenant->refresh();
    $updatedSub = $tenant->subscription();

    expect($updatedSub->id)->toBe($oldSubId)
        ->and($updatedSub->stripe_id)->toBe('sub_new_resubscribe')
        ->and($updatedSub->stripe_status)->toBe('active')
        ->and($updatedSub->active())->toBeTrue()
        ->and($tenant->subscriptions()->count())->toBe(1)
        ->and($updatedSub->items()->count())->toBe(1);
});

test('subscription activated email is sent once on transition to active', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', true);
    AppSetting::setValue('emails_subscription_activated_enabled', true);

    $tenant = Tenant::factory()->create([
        'stripe_id' => 'cus_test_email_active',
    ]);
    $owner = User::factory()->create([
        'tenant_id' => $tenant->id,
        'email' => 'owner-active@example.test',
    ]);
    $tenant->update(['owner_id' => $owner->id]);

    $subscription = $tenant->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_test_email_active',
        'stripe_status' => 'incomplete',
        'stripe_price' => 'price_test_default',
        'quantity' => 1,
    ]);

    $listener = app(StripeEventListener::class);

    $payload = [
        'type' => 'customer.subscription.updated',
        'data' => [
            'object' => [
                'id' => $subscription->stripe_id,
                'customer' => $tenant->stripe_id,
                'status' => 'active',
                'cancel_at_period_end' => false,
                'canceled_at' => null,
                'ended_at' => null,
                'current_period_start' => now()->subDay()->timestamp,
                'current_period_end' => now()->addMonth()->timestamp,
                'trial_end' => null,
            ],
        ],
    ];

    $listener->handle(new WebhookReceived($payload));
    $listener->handle(new WebhookReceived($payload));

    Mail::assertSent(SubscriptionActivatedMail::class, function (SubscriptionActivatedMail $mail) use ($owner) {
        return $mail->hasTo($owner->email);
    });
    Mail::assertSent(SubscriptionActivatedMail::class, 1);
});

test('subscription activated email respects global email toggle', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', false);
    AppSetting::setValue('emails_subscription_activated_enabled', true);

    $tenant = Tenant::factory()->create([
        'stripe_id' => 'cus_test_email_toggle',
    ]);
    $owner = User::factory()->create([
        'tenant_id' => $tenant->id,
        'email' => 'owner-toggle@example.test',
    ]);
    $tenant->update(['owner_id' => $owner->id]);

    $subscription = $tenant->subscriptions()->create([
        'type' => 'default',
        'stripe_id' => 'sub_test_email_toggle',
        'stripe_status' => 'incomplete',
        'stripe_price' => 'price_test_default',
        'quantity' => 1,
    ]);

    app(StripeEventListener::class)->handle(new WebhookReceived([
        'type' => 'customer.subscription.updated',
        'data' => [
            'object' => [
                'id' => $subscription->stripe_id,
                'customer' => $tenant->stripe_id,
                'status' => 'active',
                'cancel_at_period_end' => false,
                'canceled_at' => null,
                'ended_at' => null,
                'current_period_start' => now()->subDay()->timestamp,
                'current_period_end' => now()->addMonth()->timestamp,
                'trial_end' => null,
            ],
        ],
    ]));

    Mail::assertNothingSent();
});

test('invoice events map to invoice paid and payment failed emails', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', true);
    AppSetting::setValue('emails_invoice_paid_enabled', true);
    AppSetting::setValue('emails_payment_failed_enabled', true);

    $tenant = Tenant::factory()->create([
        'stripe_id' => 'cus_test_email_invoice',
    ]);
    $owner = User::factory()->create([
        'tenant_id' => $tenant->id,
        'email' => 'owner-invoice@example.test',
    ]);
    $tenant->update(['owner_id' => $owner->id]);

    $listener = app(StripeEventListener::class);
    $listener->handle(new WebhookReceived([
        'id' => 'evt_invoice_paid_unique',
        'type' => 'invoice.paid',
        'data' => [
            'object' => [
                'id' => 'in_123',
                'number' => 'INV-123',
                'customer' => $tenant->stripe_id,
            ],
        ],
    ]));

    $listener->handle(new WebhookReceived([
        'id' => 'evt_invoice_failed_unique',
        'type' => 'invoice.payment_failed',
        'data' => [
            'object' => [
                'id' => 'in_456',
                'number' => 'INV-456',
                'customer' => $tenant->stripe_id,
            ],
        ],
    ]));

    Mail::assertSent(InvoicePaidMail::class, 1);
    Mail::assertSent(PaymentFailedMail::class, 1);
});

test('duplicate invoice event id sends email only once', function () {
    Mail::fake();
    AppSetting::setValue('emails_enabled', true);
    AppSetting::setValue('emails_invoice_paid_enabled', true);

    $tenant = Tenant::factory()->create([
        'stripe_id' => 'cus_test_email_dedupe',
    ]);
    $owner = User::factory()->create([
        'tenant_id' => $tenant->id,
        'email' => 'owner-dedupe@example.test',
    ]);
    $tenant->update(['owner_id' => $owner->id]);

    $payload = [
        'id' => 'evt_invoice_paid_duplicate',
        'type' => 'invoice.paid',
        'data' => [
            'object' => [
                'id' => 'in_789',
                'number' => 'INV-789',
                'customer' => $tenant->stripe_id,
            ],
        ],
    ];

    $listener = app(StripeEventListener::class);
    $listener->handle(new WebhookReceived($payload));
    $listener->handle(new WebhookReceived($payload));

    Mail::assertSent(InvoicePaidMail::class, 1);
});
