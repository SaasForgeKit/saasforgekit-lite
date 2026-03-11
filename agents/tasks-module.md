# Tasks Module (Multi-Tenancy Example)

A simple CRUD module demonstrating how tenant-scoped resources work in this application. Use this as a reference when building new tenant-scoped features.

## Structure

| File | Purpose |
|------|---------|
| `app/Models/Task.php` | Uses `BelongsToTenant` trait for automatic scoping |
| `app/Http/Controllers/TaskController.php` | Resourceful controller (index, store, update, destroy) |
| `app/Http/Requests/StoreTaskRequest.php` | Validation for creating tasks |
| `app/Http/Requests/UpdateTaskRequest.php` | Validation for updating tasks |
| `resources/js/pages/tasks/index.tsx` | Single-page CRUD with inline forms |
| `routes/tenant.php` | Routes behind `auth` + `InitializeTenancyByUser` middleware |
| `tests/Feature/TaskTest.php` | CRUD tests + tenant isolation tests |

## Key Patterns

- **Model**: Add `BelongsToTenant` trait, keep `tenant_id` out of `$fillable`. The trait auto-sets `tenant_id` on creation and filters all queries by tenant.
- **Routes**: Place in `routes/tenant.php` inside the existing middleware group.
- **Frontend**: Import Wayfinder actions from `@/actions/App/Http/Controllers/TaskController`. Use `store.form()` / `update.form()` with Inertia's `<Form>` component.
- **Tests**: Always include tenant isolation tests -- assert users cannot read, update, or delete another tenant's records.

