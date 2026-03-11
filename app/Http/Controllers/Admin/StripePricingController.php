<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlanPrice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Product;
use Stripe\Stripe;

class StripePricingController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('cashier.secret'));
    }

    public function index(): Response
    {
        $plans = Plan::with('prices')->ordered()->get();

        $products = $plans->map(fn (Plan $plan) => [
            'id' => $plan->stripe_id,
            'name' => $plan->name,
            'description' => $plan->description,
            'active' => $plan->active,
            'created' => $plan->stripe_created_at?->timestamp,
            'display_order' => $plan->display_order,
            'metadata' => [
                'popular' => $plan->popular ? 'true' : '',
                'cta' => $plan->cta ?? '',
                'display_order' => (string) $plan->display_order,
                'trial_enabled' => $plan->trial_enabled ? 'true' : '',
                'trial_days' => $plan->trial_days ? (string) $plan->trial_days : '',
                'trial_without_card' => $plan->trial_without_card ? 'true' : '',
            ],
            'prices' => $plan->prices->map(fn (PlanPrice $price) => [
                'id' => $price->stripe_id,
                'unit_amount' => $price->unit_amount,
                'currency' => $price->currency,
                'recurring' => [
                    'interval' => $price->interval,
                    'interval_count' => $price->interval_count,
                ],
                'active' => $price->active,
                'nickname' => $price->nickname,
            ])->all(),
        ]);

        $active = $products->where('active', true)->values();
        $archived = $products->where('active', false)->values();

        return Inertia::render('admin/pricing/index', [
            'products' => $active->merge($archived)->all(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/pricing/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $maxOrder = Plan::max('display_order') ?? 0;

        return DB::transaction(function () use ($validated, $maxOrder) {
            $stripeProduct = Product::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'metadata' => [
                    'display_order' => $maxOrder + 1,
                    'trial_enabled' => '',
                    'trial_days' => '',
                    'trial_without_card' => '',
                ],
            ]);

            Plan::create([
                'stripe_id' => $stripeProduct->id,
                'name' => $stripeProduct->name,
                'description' => $stripeProduct->description,
                'active' => $stripeProduct->active,
                'display_order' => $maxOrder + 1,
                'stripe_created_at' => Carbon::createFromTimestamp($stripeProduct->created),
            ]);

            return redirect()->route('pricing.index')->with('success', 'Product created successfully.');
        });
    }

    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string', 'starts_with:prod_'],
        ]);

        return DB::transaction(function () use ($validated) {
            foreach ($validated['ids'] as $index => $stripeId) {
                $plan = Plan::where('stripe_id', $stripeId)->first();
                if (! $plan) {
                    continue;
                }

                Product::update($stripeId, [
                    'metadata' => $this->buildMetadata($plan, ['display_order' => (string) $index]),
                ]);

                Plan::where('stripe_id', $stripeId)->update(['display_order' => $index]);
            }

            return redirect()->route('pricing.index')->with('success', 'Order updated.');
        });
    }

    public function show(string $id): Response
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();
        $prices = $plan->prices()->orderByDesc('created_at')->get();

        return Inertia::render('admin/pricing/show', [
            'product' => [
                'id' => $plan->stripe_id,
                'name' => $plan->name,
                'description' => $plan->description,
                'active' => $plan->active,
                'created' => $plan->stripe_created_at?->timestamp,
                'metadata' => $this->buildMetadata($plan),
            ],
            'prices' => $prices->map(fn (PlanPrice $price) => [
                'id' => $price->stripe_id,
                'type' => $price->type ?? 'base',
                'unit_amount' => $price->unit_amount,
                'currency' => $price->currency,
                'recurring' => [
                    'interval' => $price->interval,
                    'interval_count' => $price->interval_count,
                ],
                'active' => $price->active,
                'nickname' => $price->nickname,
                'created' => $price->stripe_created_at?->timestamp,
            ])->all(),
        ]);
    }

    public function edit(string $id): Response
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();

        return Inertia::render('admin/pricing/edit', [
            'product' => [
                'id' => $plan->stripe_id,
                'name' => $plan->name,
                'description' => $plan->description,
                'active' => $plan->active,
                'popular' => $plan->popular,
                'cta' => $plan->cta ?? '',
                'trial_enabled' => $plan->trial_enabled,
                'trial_days' => $plan->trial_days,
                'trial_without_card' => $plan->trial_without_card,
            ],
        ]);
    }

    public function update(Request $request, string $id)
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();

        if ($request->boolean('_reactivate')) {
            return DB::transaction(function () use ($plan) {
                Product::update($plan->stripe_id, ['active' => true]);
                $plan->update(['active' => true]);

                return redirect()->route('pricing.index')->with('success', 'Product reactivated successfully.');
            });
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'active' => ['required', 'boolean'],
            'popular' => ['required', 'boolean'],
            'cta' => ['nullable', 'string', 'max:50'],
            'trial_enabled' => ['required', 'boolean'],
            'trial_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'trial_without_card' => ['required', 'boolean'],
        ]);

        if (! $validated['trial_enabled']) {
            $validated['trial_days'] = null;
            $validated['trial_without_card'] = false;
        }

        return DB::transaction(function () use ($validated, $plan) {
            $stripeProduct = Product::update($plan->stripe_id, [
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'active' => $validated['active'],
                'metadata' => $this->buildMetadata($plan, [
                    'popular' => $validated['popular'] ? 'true' : '',
                    'cta' => $validated['cta'] ?? '',
                    'trial_enabled' => $validated['trial_enabled'] ? 'true' : '',
                    'trial_days' => $validated['trial_days'] ? (string) $validated['trial_days'] : '',
                    'trial_without_card' => $validated['trial_without_card'] ? 'true' : '',
                ]),
            ]);
            $this->syncPlanFromStripeProduct($plan, $stripeProduct);

            return redirect()->route('pricing.index')->with('success', 'Product updated successfully.');
        });
    }

    public function updateFeatures(Request $request, string $id)
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();

        $validated = $request->validate([
            'features' => ['present', 'array', 'max:20'],
            'features.*' => ['required', 'string', 'max:255'],
        ]);

        $oldFeatures = $plan->features ?? [];

        $updatedMetadata = [];
        foreach ($oldFeatures as $index => $feature) {
            $updatedMetadata["feature_{$index}"] = '';
        }
        foreach ($validated['features'] as $index => $feature) {
            $updatedMetadata["feature_{$index}"] = $feature;
        }

        return DB::transaction(function () use ($plan, $updatedMetadata) {
            $stripeProduct = Product::update($plan->stripe_id, [
                'metadata' => $this->buildMetadata($plan, $updatedMetadata),
            ]);
            $this->syncPlanFromStripeProduct($plan, $stripeProduct);

            return redirect()->route('pricing.show', $plan->stripe_id)->with('success', 'Features updated.');
        });
    }

    public function destroy(string $id)
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();

        return DB::transaction(function () use ($plan) {
            Product::update($plan->stripe_id, ['active' => false]);
            $plan->update(['active' => false]);

            return redirect()->route('pricing.index')->with('success', 'Pricing archived successfully.');
        });
    }

    protected function buildMetadata(Plan $plan, array $overrides = []): array
    {
        $metadata = [
            'display_order' => (string) $plan->display_order,
            'popular' => $plan->popular ? 'true' : '',
            'cta' => $plan->cta ?? '',
            'trial_enabled' => $plan->trial_enabled ? 'true' : '',
            'trial_days' => $plan->trial_days ? (string) $plan->trial_days : '',
            'trial_without_card' => $plan->trial_without_card ? 'true' : '',
        ];

        foreach ($plan->features ?? [] as $index => $feature) {
            $metadata["feature_{$index}"] = $feature;
        }

        return array_merge($metadata, $overrides);
    }

    protected function syncPlanFromStripeProduct(Plan $plan, Product $stripeProduct): void
    {
        $metadata = $stripeProduct->metadata?->toArray() ?? [];
        $trialEnabled = ($metadata['trial_enabled'] ?? '') === 'true';
        $trialDays = isset($metadata['trial_days']) && is_numeric($metadata['trial_days'])
            ? (int) $metadata['trial_days']
            : null;
        $trialWithoutCard = ($metadata['trial_without_card'] ?? '') === 'true';

        $features = collect($metadata)
            ->filter(fn ($value, $key) => str_starts_with($key, 'feature_') && $value !== '')
            ->sortKeysUsing(fn ($a, $b) => (int) Str::after($a, 'feature_') <=> (int) Str::after($b, 'feature_'))
            ->values()
            ->all();

        $plan->update([
            'name' => $stripeProduct->name,
            'description' => $stripeProduct->description,
            'active' => $stripeProduct->active,
            'popular' => ($metadata['popular'] ?? '') === 'true',
            'cta' => $metadata['cta'] ?? null,
            'trial_enabled' => $trialEnabled,
            'trial_days' => $trialEnabled ? $trialDays : null,
            'trial_without_card' => $trialEnabled ? $trialWithoutCard : false,
            'features' => $features ?: null,
        ]);
    }
}
