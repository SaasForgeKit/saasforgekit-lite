<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\PlanPrice;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Stripe\Price;
use Stripe\Product;
use Stripe\Stripe;

class ImportStripeData extends Command
{
    protected $signature = 'stripe:import';

    protected $description = 'One-time import of existing Stripe products and prices into local database';

    public function handle(): int
    {
        Stripe::setApiKey(config('cashier.secret'));

        $this->info('Importing Stripe products...');

        $activeProducts = Product::all(['limit' => 100, 'active' => true]);
        $archivedProducts = Product::all(['limit' => 100, 'active' => false]);

        $allProducts = array_merge($activeProducts->data, $archivedProducts->data);
        $this->info(sprintf('Found %d products.', count($allProducts)));

        foreach ($allProducts as $product) {
            $metadata = $product->metadata?->toArray() ?? [];

            $features = collect($metadata)
                ->filter(fn ($value, $key) => str_starts_with($key, 'feature_') && $value !== '')
                ->sortKeys()
                ->values()
                ->all();

            $plan = Plan::updateOrCreate(
                ['stripe_id' => $product->id],
                [
                    'name' => $product->name,
                    'description' => $product->description,
                    'active' => $product->active,
                    'display_order' => (int) ($metadata['display_order'] ?? 0),
                    'popular' => ($metadata['popular'] ?? '') === 'true',
                    'cta' => $metadata['cta'] ?? null,
                    'trial_enabled' => ($metadata['trial_enabled'] ?? '') === 'true',
                    'trial_days' => isset($metadata['trial_days']) && is_numeric($metadata['trial_days'])
                        ? (int) $metadata['trial_days']
                        : null,
                    'trial_without_card' => ($metadata['trial_without_card'] ?? '') === 'true',
                    'features' => $features ?: null,
                    'stripe_created_at' => Carbon::createFromTimestamp($product->created),
                ]
            );

            $prices = Price::all([
                'product' => $product->id,
                'limit' => 100,
            ]);

            foreach ($prices->data as $price) {
                if ($price->unit_amount === null || $price->recurring?->interval === null) {
                    $this->warn(sprintf(
                        '  - Skipping unsupported price %s for %s (unit_amount or recurring interval is null).',
                        $price->id,
                        $product->name
                    ));

                    continue;
                }

                PlanPrice::updateOrCreate(
                    ['stripe_id' => $price->id],
                    [
                        'plan_id' => $plan->id,
                        'unit_amount' => $price->unit_amount,
                        'currency' => $price->currency,
                        'interval' => $price->recurring->interval,
                        'interval_count' => $price->recurring?->interval_count ?? 1,
                        'nickname' => $price->nickname,
                        'active' => $price->active,
                        'stripe_created_at' => Carbon::createFromTimestamp($price->created),
                    ]
                );
            }

            $this->line(sprintf(
                '  %s %s (%d prices)',
                $product->active ? '✓' : '✗',
                $product->name,
                count($prices->data)
            ));
        }

        $this->info('Import complete.');

        return self::SUCCESS;
    }
}
