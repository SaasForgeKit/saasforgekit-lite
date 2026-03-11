<?php

namespace App\Listeners;

use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\Tenant;
use App\Services\BillingEmailService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Events\WebhookReceived;

class StripeEventListener
{
    public function __construct(
        protected BillingEmailService $billingEmailService,
    ) {}

    public function handle(WebhookReceived $event): void
    {
        match ($event->payload['type'] ?? null) {
            'product.created', 'product.updated', => $this->handleProduct($event->payload['data']['object']),
            'product.deleted' => $this->handleProductDeleted($event->payload['data']['object']),
            'price.created', 'price.updated' => $this->handlePrice($event->payload['data']['object']),
            'price.deleted' => $this->handlePriceDeleted($event->payload['data']['object']),
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted' => $this->handleSubscription($event->payload['data']['object']),
            'invoice.paid' => $this->handleInvoicePaid($event->payload['data']['object'], $event->payload['id'] ?? null),
            'invoice.payment_failed' => $this->handleInvoicePaymentFailed($event->payload['data']['object'], $event->payload['id'] ?? null),
            default => null,
        };
    }

    protected function handleProduct(array $product): void
    {
        $metadata = $product['metadata'] ?? [];

        $features = collect($metadata)
            ->filter(fn ($value, $key) => str_starts_with($key, 'feature_') && $value !== '')
            ->sortKeys()
            ->values()
            ->all();

        Plan::updateOrCreate(
            ['stripe_id' => $product['id']],
            [
                'name' => $product['name'],
                'description' => $product['description'] ?? null,
                'active' => $product['active'],
                'display_order' => (int) ($metadata['display_order'] ?? 0),
                'popular' => ($metadata['popular'] ?? '') === 'true',
                'cta' => $metadata['cta'] ?? null,
                'trial_enabled' => ($metadata['trial_enabled'] ?? '') === 'true',
                'trial_days' => isset($metadata['trial_days']) && is_numeric($metadata['trial_days'])
                    ? (int) $metadata['trial_days']
                    : null,
                'trial_without_card' => ($metadata['trial_without_card'] ?? '') === 'true',
                'features' => $features ?: null,
                'stripe_created_at' => Carbon::createFromTimestamp($product['created']),
            ]
        );
    }

    protected function handleProductDeleted(array $product): void
    {
        Plan::where('stripe_id', $product['id'])->delete();
    }

    protected function handlePrice(array $price): void
    {
        $plan = Plan::where('stripe_id', $price['product'])->first();

        if (! $plan) {
            return;
        }

        if (($price['unit_amount'] ?? null) === null || ! isset($price['recurring']['interval'])) {
            return;
        }

        $metadata = $price['metadata'] ?? [];
        $priceType = $metadata['price_type'] ?? 'base';
        if (! in_array($priceType, ['base'], true)) {
            $priceType = 'base';
        }

        PlanPrice::updateOrCreate(
            ['stripe_id' => $price['id']],
            [
                'plan_id' => $plan->id,
                'type' => $priceType,
                'unit_amount' => $price['unit_amount'],
                'currency' => $price['currency'],
                'interval' => $price['recurring']['interval'],
                'interval_count' => $price['recurring']['interval_count'] ?? 1,
                'nickname' => $price['nickname'] ?? null,
                'active' => $price['active'],
                'stripe_created_at' => Carbon::createFromTimestamp($price['created']),
            ]
        );
    }

    protected function handlePriceDeleted(array $price): void
    {
        PlanPrice::where('stripe_id', $price['id'])->delete();
    }

    protected function handleSubscription(array $subscription): void
    {
        $customerId = $subscription['customer'];
        $customer = Cashier::findBillable($customerId);

        if (! $customer instanceof Tenant) {
            return;
        }

        $localSubscription = $customer->subscriptions()
            ->where('stripe_id', $subscription['id'])
            ->first();

        if (! $localSubscription) {
            return;
        }

        $previousStatus = $localSubscription->stripe_status;
        $wasCancellation = ! empty($localSubscription->ends_at)
            || in_array($previousStatus, ['canceled', 'incomplete_expired', 'unpaid'], true);

        $cancelAtPeriodEnd = (bool) ($subscription['cancel_at_period_end'] ?? false);
        $status = $subscription['status'] ?? null;
        $isCancellation = $cancelAtPeriodEnd
            || ! empty($subscription['canceled_at'])
            || in_array($status, ['canceled', 'incomplete_expired', 'unpaid'], true);

        $localSubscription->update([
            'stripe_status' => $status ?? $localSubscription->stripe_status,
            'current_period_start' => isset($subscription['current_period_start'])
                ? Carbon::createFromTimestamp($subscription['current_period_start'])
                : null,
            'current_period_end' => isset($subscription['current_period_end'])
                ? Carbon::createFromTimestamp($subscription['current_period_end'])
                : null,
            'trial_ends_at' => isset($subscription['trial_end']) && $subscription['trial_end']
                ? Carbon::createFromTimestamp($subscription['trial_end'])
                : null,
            'ends_at' => isset($subscription['ended_at']) && $subscription['ended_at']
                ? Carbon::createFromTimestamp($subscription['ended_at'])
                : ($cancelAtPeriodEnd && isset($subscription['current_period_end']) && $subscription['current_period_end']
                    ? Carbon::createFromTimestamp($subscription['current_period_end'])
                    : null),
        ]);

        if ($status === 'trialing' && $previousStatus !== 'trialing') {
            $this->billingEmailService->sendTrialStarted(
                $customer,
                isset($subscription['trial_end']) && $subscription['trial_end']
                    ? Carbon::createFromTimestamp($subscription['trial_end'])->toDateString()
                    : null,
            );
        }

        if (! $isCancellation && $status === 'active' && $previousStatus !== 'active') {
            $this->billingEmailService->sendSubscriptionActivated($customer, $status);
        }

        if ($isCancellation && ! $wasCancellation) {
            $this->billingEmailService->sendSubscriptionCanceled(
                $customer,
                $localSubscription->ends_at?->toDateString(),
            );
        }
    }

    protected function handleInvoicePaid(array $invoice, ?string $eventId): void
    {
        if (! $this->lockEvent($eventId)) {
            return;
        }

        $customer = Cashier::findBillable($invoice['customer'] ?? null);
        if (! $customer instanceof Tenant) {
            return;
        }

        $this->billingEmailService->sendInvoicePaid(
            $customer,
            (string) ($invoice['number'] ?? $invoice['id'] ?? ''),
        );
    }

    protected function handleInvoicePaymentFailed(array $invoice, ?string $eventId): void
    {
        if (! $this->lockEvent($eventId)) {
            return;
        }

        $customer = Cashier::findBillable($invoice['customer'] ?? null);
        if (! $customer instanceof Tenant) {
            return;
        }

        $this->billingEmailService->sendPaymentFailed(
            $customer,
            (string) ($invoice['number'] ?? $invoice['id'] ?? ''),
        );
    }

    protected function lockEvent(?string $eventId): bool
    {
        if (! $eventId) {
            return true;
        }

        return Cache::add(
            key: 'billing_email_event_'.$eventId,
            value: true,
            ttl: now()->addDays(30),
        );
    }
}
