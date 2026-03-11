# Tenants Admin View

Admins can view and manage all tenant organizations from `/admin/tenants`. This provides a read-heavy dashboard with soft-delete/restore and permanent deletion capabilities.

## How It Works

### Index Page

The index page shows two sections:

1. **Active tenants** — paginated (15 per page), ordered newest first, excludes admin tenants
2. **Deactivated tenants** — all soft-deleted tenants shown in a separate table

Each tenant row displays the owner's name/email, subscription status badge (`active`, `trialing`, or `inactive`), plan name, and creation date.

Subscription status is resolved by:
1. Collecting all `stripe_price` IDs from tenant subscriptions
2. Batch-querying local `PlanPrice` records (with their parent `Plan`) in a single query
3. Mapping each tenant to its plan name via the price → plan relationship

This avoids N+1 queries and any Stripe API calls on the index page.

### Show Page

The detail view shows three cards:

- **Tenant Info** — ID, Stripe customer ID (linked to Stripe Dashboard), payment method, generic trial status, timestamps
- **Owner** — name, email, email verification status
- **Subscription** — plan name, price nickname, interval, status, trial/grace period, billing period dates

### Deactivate (Soft Delete)

Deactivating a tenant (`destroy` action):
1. Cancels any active Stripe subscription immediately (`cancelNow()`)
2. Soft-deletes the associated user
3. Soft-deletes the tenant
4. Admin tenants are protected — returns 403

### Restore

Restoring a deactivated tenant (`restore` action):
1. Restores the soft-deleted tenant
2. Restores the soft-deleted user
3. Does **not** restore the cancelled subscription — the tenant will need to resubscribe

### Force Delete (Permanent)

Permanently deleting a tenant (`forceDestroy` action):
1. Requires the admin's password for confirmation
2. Cancels any active subscription immediately
3. Permanently deletes the tenant (cascade deletes related records)
4. Admin tenants are protected — returns 403

## Admin Routes

| Method | URI | Action | Name |
|--------|-----|--------|------|
| GET | /admin/tenants | `index` | `tenants.index` |
| GET | /admin/tenants/{tenant} | `show` | `tenants.show` |
| DELETE | /admin/tenants/{tenant} | `destroy` (soft delete) | `tenants.destroy` |
| POST | /admin/tenants/{tenant}/restore | `restore` | `tenants.restore` |
| DELETE | /admin/tenants/{tenant}/force | `forceDestroy` | `tenants.force-destroy` |

All routes are protected by `EnsureAdmin` middleware.

## Key Files

| File | Purpose |
|------|---------|
| `app/Http/Controllers/Admin/TenantController.php` | All tenant admin logic (index, show, deactivate, restore, force-delete) |
| `resources/js/pages/admin/tenants/index.tsx` | Tenant list with active/deactivated tables, pagination, deactivate/restore dialogs |
| `resources/js/pages/admin/tenants/show.tsx` | Tenant detail view with info cards, deactivate/restore/force-delete actions |
| `routes/admin.php` | Route definitions (shared with pricing admin routes) |
| `app/Http/Middleware/EnsureAdmin.php` | Guards all admin routes (requires `admin` role) |

## Frontend Patterns

- Uses Wayfinder-generated route functions from `@/actions/App/Http/Controllers/Admin/TenantController`
- Deactivate and restore use the confirm dialog pattern (see `agents/confirm-dialog.md`)
- Force delete uses password confirmation via a form input inside a dialog
- Status badges use color-coded variants: green for `active`, yellow for `trialing`, gray for `inactive`
- Pagination is handled via Inertia's `Link` component with Laravel's paginator URLs
