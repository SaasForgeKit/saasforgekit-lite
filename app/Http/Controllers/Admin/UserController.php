<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlanPrice;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $excludeAdmins = fn ($query) => $query->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'));

        $active = User::with('tenant')
            ->tap($excludeAdmins)
            ->latest()
            ->paginate(15);

        $deactivated = User::onlyTrashed()
            ->with(['tenant' => fn ($q) => $q->withTrashed()])
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->latest('deleted_at')
            ->get();

        $allUsers = $active->getCollection()->merge($deactivated);
        $stripePriceIds = $allUsers
            ->map(fn (User $user) => $user->tenant?->subscription()?->stripe_price)
            ->filter()
            ->unique()
            ->values();

        $priceMap = PlanPrice::with('plan')
            ->whereIn('stripe_id', $stripePriceIds)
            ->get()
            ->keyBy('stripe_id');

        $mapUser = function (User $user) use ($priceMap) {
            $tenant = $user->tenant;
            $isTrashed = $user->trashed();
            $subscription = $tenant?->subscription();

            $status = 'inactive';
            $planName = null;

            if ($subscription?->active()) {
                $status = $subscription->onTrial() ? 'trialing' : 'active';

                if ($subscription->stripe_price && isset($priceMap[$subscription->stripe_price])) {
                    $planName = $priceMap[$subscription->stripe_price]->plan->name;
                }
            } elseif (! $isTrashed && $tenant?->onGenericTrial()) {
                $status = 'trialing';
            }

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tenant_id' => $tenant?->id,
                'subscription_status' => $status,
                'plan_name' => $planName,
                'created_at' => $user->created_at->toISOString(),
                'deactivated_at' => $user->deleted_at?->toISOString(),
            ];
        };

        return Inertia::render('admin/users/index', [
            'users' => $active->through($mapUser),
            'deactivated' => $deactivated->map($mapUser)->values(),
        ]);
    }

    public function show(string $id): Response
    {
        $user = User::withTrashed()
            ->with(['tenant' => fn ($q) => $q->withTrashed()])
            ->findOrFail($id);

        abort_if($user->hasRole('admin'), 403, 'Admin users cannot be managed.');

        $tenant = $user->tenant;
        $subscription = $tenant?->subscription();
        $isDeactivated = $user->trashed();

        $subscriptionData = null;

        if ($subscription) {
            $planName = null;
            $priceName = null;
            $interval = null;

            if ($subscription->stripe_price) {
                $planPrice = PlanPrice::with('plan')
                    ->where('stripe_id', $subscription->stripe_price)
                    ->first();

                if ($planPrice) {
                    $planName = $planPrice->plan->name;
                    $priceName = $planPrice->nickname;
                    $interval = $planPrice->interval;
                }
            }

            $subscriptionData = [
                'stripe_status' => $subscription->stripe_status,
                'stripe_price' => $subscription->stripe_price,
                'plan_name' => $planName,
                'price_name' => $priceName,
                'interval' => $interval,
                'on_trial' => $subscription->onTrial(),
                'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
                'on_grace_period' => $subscription->onGracePeriod(),
                'ends_at' => $subscription->ends_at?->toISOString(),
                'active' => $subscription->active(),
                'cancelled' => $subscription->canceled(),
                'current_period_start' => $subscription->current_period_start?->toISOString(),
                'current_period_end' => $subscription->current_period_end?->toISOString(),
                'created_at' => $subscription->created_at->toISOString(),
            ];
        }

        $stripeUrl = $tenant?->stripe_id
            ? 'https://dashboard.stripe.com/customers/'.$tenant->stripe_id
            : null;

        return Inertia::render('admin/users/show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at?->toISOString(),
                'is_deactivated' => $isDeactivated,
                'deactivated_at' => $user->deleted_at?->toISOString(),
                'created_at' => $user->created_at->toISOString(),
                'updated_at' => $user->updated_at->toISOString(),
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'stripe_id' => $tenant->stripe_id,
                'pm_type' => $tenant->pm_type,
                'pm_last_four' => $tenant->pm_last_four,
                'on_generic_trial' => ! $isDeactivated && $tenant->onGenericTrial(),
                'generic_trial_ends_at' => $tenant->trial_ends_at?->toISOString(),
                'created_at' => $tenant->created_at->toISOString(),
                'updated_at' => $tenant->updated_at->toISOString(),
            ] : null,
            'subscription' => $subscriptionData,
            'stripe_url' => $stripeUrl,
        ]);
    }

    public function destroy(string $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        abort_if($user->hasRole('admin'), 403, 'Admin users cannot be deactivated.');

        $tenant = $user->tenant;
        $subscription = $tenant?->subscription();
        if ($subscription?->active()) {
            $subscription->cancelNow();
        }

        $user->delete();
        $tenant?->delete();

        return redirect()->route('users.index')->with('success', 'User deactivated successfully.');
    }

    public function restore(string $id): RedirectResponse
    {
        $user = User::onlyTrashed()
            ->with(['tenant' => fn ($q) => $q->withTrashed()])
            ->findOrFail($id);

        abort_if($user->hasRole('admin'), 403, 'Admin users cannot be restored.');

        $user->restore();

        $tenant = $user->tenant;
        if ($tenant?->trashed()) {
            $tenant->restore();
        }

        return redirect()->route('users.show', $user->id)->with('success', 'User restored successfully.');
    }

    public function forceDestroy(Request $request, string $id): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($request->password, $request->user()->password)) {
            return back()->withErrors(['password' => 'The password you entered is incorrect.']);
        }

        $user = User::withTrashed()
            ->with(['tenant' => fn ($q) => $q->withTrashed()])
            ->findOrFail($id);

        abort_if($user->hasRole('admin'), 403, 'Admin users cannot be deleted.');

        $tenant = $user->tenant;
        $subscription = $tenant?->subscription();
        if ($subscription?->active()) {
            $subscription->cancelNow();
        }

        $user->forceDelete();
        $tenant?->forceDelete();

        return redirect()->route('users.index')->with('success', 'User permanently deleted.');
    }
}
