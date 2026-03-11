# Multi-Tenancy Guide

This application uses `stancl/tenancy` in single-database mode only.

## Tenancy Model

- All tenants share one database.
- Tenant data is isolated using `tenant_id` and tenancy scoping.
- Plain authenticated routes are used (`/dashboard`, `/tasks`).
- Per-tenant database creation and migration are not supported in the lite edition.

## Registration Flow

When a user registers:

1. A `Tenant` record is created.
2. A `User` is created and linked via `tenant_id`.

This flow runs in a database transaction.

## Tenant Initialization

After authentication, tenancy is initialized from the authenticated user's tenant context.
The following bootstrappers are active:

- `CacheTenancyBootstrapper`
- `FilesystemTenancyBootstrapper`
- `QueueTenancyBootstrapper`

`DatabaseTenancyBootstrapper` is intentionally not used in lite mode.

## Tenant-Scoped Models

Use `BelongsToTenant` on tenant-scoped models:

```php
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Project extends Model
{
    use BelongsToTenant;
}
```

This automatically scopes queries to the current tenant and sets `tenant_id` on create.

## Migrations

Run standard migrations only:

```bash
php artisan migrate
```

Tenant data tables live in `database/migrations` and include `tenant_id` foreign keys where needed.
Do not use tenant database migration commands for lite mode.

## Security Notes

- Keep tenant models on `BelongsToTenant` to preserve isolation.
- Avoid raw unscoped queries for tenant-owned data.
- Tenant context is derived from authenticated user state, not user-editable request input.
