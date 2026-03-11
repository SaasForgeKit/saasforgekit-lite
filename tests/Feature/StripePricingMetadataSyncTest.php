<?php

use App\Listeners\StripeEventListener;
use App\Models\Plan;
use App\Models\PlanPrice;
use Laravel\Cashier\Events\WebhookReceived;

test('price webhook falls back unsupported price type to base', function () {
    $plan = Plan::create([
        'stripe_id' => 'prod_sync_price_type',
        'name' => 'Pro',
        'description' => null,
        'active' => true,
        'display_order' => 2,
    ]);

    $listener = app(StripeEventListener::class);
    $listener->handle(new WebhookReceived([
        'type' => 'price.updated',
        'data' => [
            'object' => [
                'id' => 'price_sync_legacy',
                'product' => $plan->stripe_id,
                'unit_amount' => 1500,
                'currency' => 'usd',
                'recurring' => [
                    'interval' => 'month',
                    'interval_count' => 1,
                ],
                'nickname' => 'Legacy',
                'active' => true,
                'created' => now()->timestamp,
                'metadata' => [
                    'price_type' => 'legacy',
                ],
            ],
        ],
    ]));

    $price = PlanPrice::where('stripe_id', 'price_sync_legacy')->first();

    expect($price)->not->toBeNull()
        ->and($price->type)->toBe('base')
        ->and($price->plan_id)->toBe($plan->id);
});
