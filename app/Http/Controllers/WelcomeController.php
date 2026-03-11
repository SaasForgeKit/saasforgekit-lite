<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanPrice;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class WelcomeController extends Controller
{
    public function __invoke(): Response
    {
        $dbPlans = Plan::active()
            ->ordered()
            ->with('activePrices')
            ->get();

        $plans = [];

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
                'prices' => $planPrices,
            ];
        }

        return Inertia::render('welcome', [
            'canRegister' => Features::enabled(Features::registration()),
            'plans' => $plans,
        ]);
    }
}
