# Testing Guide

This application uses [Pest v4](https://pestphp.com/) on top of PHPUnit v12.

## Running Tests

```bash
# Run all tests
php artisan test

# Run lint + tests
composer test

# Run a specific test file or filter
php artisan test --compact tests/Feature/TaskTest.php
php artisan test --compact --filter=TaskTest
```

## Tenancy Testing Model (Lite)

- The lite edition supports single-database multi-tenancy only.
- Tests should validate tenant isolation using tenant-scoped models and middleware behavior.

## Directory Structure

```text
tests/
├── Pest.php
├── TestCase.php
├── Unit/
└── Feature/
```

## Isolation Test Pattern

```php
test('users cannot access another tenant task', function () {
    $user = User::factory()->withSubscription()->create();
    $otherUser = User::factory()->withSubscription()->create();

    tenancy()->initialize($otherUser->tenant);
    $task = Task::factory()->create();
    tenancy()->end();

    $this->actingAs($user)
        ->get(route('tasks.show', $task))
        ->assertForbidden();
});
```

Focus on assertions that confirm cross-tenant data access is blocked.
