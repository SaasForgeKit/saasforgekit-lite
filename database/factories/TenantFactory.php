<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $accountName = $this->faker->company().' Account';

        return [
            'name' => $accountName,
        ];
    }

    public function subscribed(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            $tenant->subscriptions()->create([
                'type' => 'default',
                'stripe_id' => 'sub_test_'.Str::random(14),
                'stripe_status' => 'active',
                'stripe_price' => 'price_test_default',
                'quantity' => 1,
            ]);
        });
    }

    public function cancelledSubscription(): static
    {
        return $this->afterCreating(function (Tenant $tenant) {
            $tenant->subscriptions()->create([
                'type' => 'default',
                'stripe_id' => 'sub_test_'.Str::random(14),
                'stripe_status' => 'canceled',
                'stripe_price' => 'price_test_default',
                'quantity' => 1,
                'ends_at' => now()->subDay(),
            ]);
        });
    }
}
