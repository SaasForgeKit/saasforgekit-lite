<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlanPrice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Stripe\Price;
use Stripe\Stripe;

class StripePriceController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('cashier.secret'));
    }

    public function store(Request $request, string $id)
    {
        $plan = Plan::where('stripe_id', $id)->firstOrFail();

        $validated = $request->validate([
            'unit_amount' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'interval' => ['required', 'string', 'in:day,week,month,year'],
            'interval_count' => ['nullable', 'integer', 'min:1'],
            'nickname' => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($plan, $validated) {
            $stripePrice = Price::create([
                'product' => $plan->stripe_id,
                'unit_amount' => $validated['unit_amount'],
                'currency' => strtolower($validated['currency']),
                'recurring' => [
                    'interval' => $validated['interval'],
                    'interval_count' => $validated['interval_count'] ?? 1,
                ],
                'nickname' => $validated['nickname'] ?? null,
                'metadata' => [
                    'price_type' => 'base',
                ],
            ]);

            PlanPrice::create([
                'plan_id' => $plan->id,
                'type' => 'base',
                'stripe_id' => $stripePrice->id,
                'unit_amount' => $stripePrice->unit_amount,
                'currency' => $stripePrice->currency,
                'interval' => $stripePrice->recurring->interval,
                'interval_count' => $stripePrice->recurring->interval_count,
                'nickname' => $stripePrice->nickname,
                'active' => $stripePrice->active,
                'stripe_created_at' => Carbon::createFromTimestamp($stripePrice->created),
            ]);

            return redirect()->route('pricing.show', $plan->stripe_id)->with('success', 'Price created successfully.');
        });
    }

    public function update(Request $request, string $id)
    {
        $planPrice = PlanPrice::where('stripe_id', $id)->with('plan')->firstOrFail();

        $validated = $request->validate([
            'active' => ['required', 'boolean'],
            'nickname' => ['nullable', 'string', 'max:255'],
        ]);

        return DB::transaction(function () use ($planPrice, $validated) {
            Price::update($planPrice->stripe_id, [
                'active' => $validated['active'],
                'nickname' => $validated['nickname'] ?? null,
            ]);

            $planPrice->update([
                'active' => $validated['active'],
                'nickname' => $validated['nickname'] ?? null,
            ]);

            return redirect()->route('pricing.show', $planPrice->plan->stripe_id)->with('success', 'Price updated successfully.');
        });
    }

    public function destroy(string $id)
    {
        $planPrice = PlanPrice::where('stripe_id', $id)->with('plan')->firstOrFail();

        return DB::transaction(function () use ($planPrice) {
            Price::update($planPrice->stripe_id, ['active' => false]);
            $planPrice->update(['active' => false]);

            return redirect()->route('pricing.show', $planPrice->plan->stripe_id)->with('success', 'Price deactivated successfully.');
        });
    }
}
