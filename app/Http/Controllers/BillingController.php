<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Tenant $tenant */
        $tenant = tenant();
        $subscription = $tenant->subscription();

        if (! $subscription?->active() && $request->filled('session_id')) {
            try {
                $session = $tenant->stripe()->checkout->sessions->retrieve($request->string('session_id'));
                $stripeSubscriptionId = $session->subscription;

                if ($stripeSubscriptionId && ! $tenant->subscriptions()->where('stripe_id', $stripeSubscriptionId)->exists()) {
                    $stripeSub = $tenant->stripe()->subscriptions->retrieve($stripeSubscriptionId, ['expand' => ['items']]);

                    $subAttributes = [
                        'type' => 'default',
                        'stripe_id' => $stripeSub->id,
                        'stripe_status' => $stripeSub->status,
                        'stripe_price' => $stripeSub->items->data[0]->price->id ?? null,
                        'quantity' => $stripeSub->items->data[0]->quantity ?? null,
                        'trial_ends_at' => $stripeSub->trial_end ? Carbon::createFromTimestamp($stripeSub->trial_end) : null,
                        'ends_at' => null,
                        'current_period_start' => $stripeSub->current_period_start ? Carbon::createFromTimestamp($stripeSub->current_period_start) : null,
                        'current_period_end' => $stripeSub->current_period_end ? Carbon::createFromTimestamp($stripeSub->current_period_end) : null,
                    ];

                    if ($subscription) {
                        $subscription->items()->delete();
                        $subscription->update($subAttributes);
                        $localSub = $subscription->fresh();
                    } else {
                        $localSub = $tenant->subscriptions()->create($subAttributes);
                    }

                    foreach ($stripeSub->items->data as $item) {
                        $localSub->items()->create([
                            'stripe_id' => $item->id,
                            'stripe_product' => $item->price->product,
                            'stripe_price' => $item->price->id,
                            'quantity' => $item->quantity ?? null,
                        ]);
                    }

                    $subscription = $localSub;
                }
            } catch (\Throwable) {
                // Bad or expired session ID — continue without sync
            }
        }

        $dbPlans = Plan::active()
            ->ordered()
            ->with('activePrices')
            ->get();

        $plans = [];
        $currentPlanName = null;
        $currentPrice = null;
        $currentFeatures = [];

        $subscribedPriceIds = [];
        if ($subscription) {
            $subscribedPriceIds = $subscription->items->pluck('stripe_price')->all();
            if ($subscription->stripe_price) {
                $subscribedPriceIds[] = $subscription->stripe_price;
            }
            $subscribedPriceIds = array_unique($subscribedPriceIds);
        }

        foreach ($dbPlans as $plan) {
            if ($plan->activePrices->isEmpty()) {
                continue;
            }

            $planPrices = $plan->activePrices->map(fn (PlanPrice $price) => [
                'id' => $price->stripe_id,
                'unit_amount' => $price->unit_amount,
                'currency' => $price->currency,
                'interval' => $price->interval,
                'interval_count' => $price->interval_count,
                'nickname' => $price->nickname,
            ])->values()->all();

            $metadata = [
                'popular' => $plan->popular ? 'true' : '',
                'cta' => $plan->cta ?? '',
                'trial_enabled' => $plan->trial_enabled ? 'true' : '',
                'trial_days' => $plan->trial_days ? (string) $plan->trial_days : '',
                'trial_without_card' => $plan->trial_without_card ? 'true' : '',
            ];

            foreach ($plan->features ?? [] as $index => $feature) {
                $metadata["feature_{$index}"] = $feature;
            }

            $plans[] = [
                'id' => $plan->stripe_id,
                'name' => $plan->name,
                'description' => $plan->description,
                'metadata' => $metadata,
                'display_order' => $plan->display_order,
                'prices' => $planPrices,
            ];

            if ($subscription && ! empty($subscribedPriceIds)) {
                $matchingPrice = $plan->activePrices->first(fn (PlanPrice $p) => in_array($p->stripe_id, $subscribedPriceIds, true));
                if ($matchingPrice) {
                    $currentPlanName = $plan->name;
                    $basePrice = $plan->activePrices->firstWhere('stripe_id', $matchingPrice->stripe_id)
                        ?? $plan->activePrices->first();
                    if ($basePrice) {
                        $currentPrice = [
                            'unit_amount' => $basePrice->unit_amount,
                            'currency' => $basePrice->currency,
                            'interval' => $basePrice->interval,
                        ];
                    }
                    $currentFeatures = $plan->features ?? [];
                }
            }
        }

        $subscriptionData = null;

        if ($subscription) {
            $subscriptionData = [
                'stripe_status' => $subscription->stripe_status,
                'stripe_price' => $subscription->stripe_price,
                'plan_name' => $currentPlanName,
                'on_trial' => $subscription->onTrial(),
                'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'ends_at' => $subscription->ends_at?->toISOString(),
                'active' => $subscription->active(),
                'cancelled' => $subscription->canceled(),
                'current_price' => $currentPrice,
                'current_period_start' => $subscription->current_period_start?->toISOString(),
                'current_period_end' => $subscription->current_period_end?->toISOString(),
                'created_at' => $subscription->created_at->toISOString(),
                'features' => $currentFeatures,
            ];
        }

        return Inertia::render('billing/index', [
            'plans' => $plans,
            'subscription' => $subscriptionData,
            'on_generic_trial' => $tenant->onGenericTrial(),
            'generic_trial_ends_at' => $tenant->trial_ends_at?->toISOString(),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'price_id' => ['required', 'string', 'starts_with:price_'],
        ]);

        $planPrice = PlanPrice::where('stripe_id', $request->string('price_id'))
            ->with('plan')
            ->where('active', true)
            ->where('type', 'base')
            ->firstOrFail();

        /** @var Tenant $tenant */
        $tenant = tenant();
        $plan = $planPrice->plan;
        $subscription = $tenant->newSubscription('default', $planPrice->stripe_id);

        $trialSettings = $this->resolveTrialSettings($tenant, $plan);
        if ($trialSettings['days']) {
            $subscription->trialUntil(now()->addDays($trialSettings['days'])->endOfDay());
        }

        $checkoutOptions = [
            'success_url' => route('billing').'?checkout=success&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('billing').'?checkout=cancelled',
        ];

        $checkoutEmail = $request->user()?->email;
        $checkoutCustomerOptions = [];

        if ($checkoutEmail && $tenant->hasStripeId()) {
            // Existing Stripe customers ignore customer_email in Checkout, so keep customer email in sync.
            try {
                $tenant->updateStripeCustomer(['email' => $checkoutEmail]);
            } catch (\Throwable) {
                // Non-critical: continue checkout even if customer update fails.
            }
        }

        if ($checkoutEmail) {
            // Cashier always sets the `customer` param for subscription checkout sessions.
            // Provide email via customer creation/update options to avoid Stripe conflict.
            $checkoutCustomerOptions['email'] = $checkoutEmail;
        }

        if ($trialSettings['days'] && $trialSettings['without_card']) {
            $checkoutOptions['payment_method_collection'] = 'if_required';
        }

        $session = $subscription->checkout($checkoutOptions, $checkoutCustomerOptions);

        return response()->json(['url' => $session->url]);
    }

    public function portal(): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = tenant();

        $url = $tenant->billingPortalUrl(route('billing'));

        return response()->json(['url' => $url]);
    }

    /**
     * @return array{days:int|null, without_card:bool}
     */
    protected function resolveTrialSettings(Tenant $tenant, Plan $plan): array
    {
        $fallbackTrialDays = $plan->trial_enabled && $plan->trial_days ? $plan->trial_days : null;
        $fallbackWithoutCard = $plan->trial_enabled ? $plan->trial_without_card : false;

        try {
            $stripeProduct = $tenant->stripe()->products->retrieve($plan->stripe_id, []);
            $metadata = $stripeProduct->metadata?->toArray() ?? [];

            $trialEnabled = ($metadata['trial_enabled'] ?? '') === 'true';
            $trialDays = isset($metadata['trial_days']) && is_numeric($metadata['trial_days'])
                ? (int) $metadata['trial_days']
                : null;
            $trialWithoutCard = ($metadata['trial_without_card'] ?? '') === 'true';
            $canonicalTrialDays = $trialEnabled && $trialDays ? $trialDays : null;
            $canonicalWithoutCard = $trialEnabled && $canonicalTrialDays ? $trialWithoutCard : false;

            if (
                $plan->trial_enabled !== $trialEnabled
                || $plan->trial_days !== $canonicalTrialDays
                || $plan->trial_without_card !== $canonicalWithoutCard
            ) {
                $plan->update([
                    'trial_enabled' => $trialEnabled,
                    'trial_days' => $canonicalTrialDays,
                    'trial_without_card' => $canonicalWithoutCard,
                ]);
            }

            return [
                'days' => $canonicalTrialDays,
                'without_card' => $canonicalWithoutCard,
            ];
        } catch (\Throwable) {
            return [
                'days' => $fallbackTrialDays,
                'without_card' => $fallbackWithoutCard && (bool) $fallbackTrialDays,
            ];
        }
    }

}
