# Billing (Stripe via Laravel Cashier)

This application uses Laravel Cashier with the `Tenant` model as the billable entity.  
Each user belongs to one tenant, and each tenant can have one active subscription.

## Core Flow

1. Authenticated users open `/billing`.
2. The app reads plans/prices from local `plans` and `plan_prices` mirrors.
3. Checkout starts via `POST /billing/checkout` with a selected `price_id`.
4. Stripe redirects back to `/billing?checkout=success`.
5. Webhooks sync subscription/product/price updates into local tables.

## Tenant and Access Model

- Billing routes live under tenant-initialized middleware.
- Subscription-gated routes use `EnsureSubscribed`.

## Admin Pricing

Admins manage products/prices at `/admin/pricing`:

- Create/update/archive products
- Create/update/deactivate prices
- Reorder products
- Manage metadata features/CTA/trial fields

All writes are dual-written to Stripe and local DB.

## Webhook Sync

`StripeEventListener` handles product, price, and subscription webhook events and keeps:

- `plans`
- `plan_prices`
- tenant subscription states

in sync with Stripe.

## Useful Commands

```bash
php artisan stripe:import
stripe listen --forward-to https://saasforgekit.test/stripe/webhook
```
