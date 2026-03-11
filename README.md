# SaaS Forge Kit Lite

Open-source Laravel + Inertia React SaaS starter kit focused on a clean lite baseline:

- single database multi-tenancy
- one tenant per user
- plain authenticated app routes (`/dashboard`, `/tasks`, `/billing`)
- Stripe billing with plan/price management

This repository is the **Lite** edition.

## Lite vs Pro

Pro-only features:

- multi-database tenancy
- workspaces/teams/invitations
- seat-based pricing
- free tier

- More information: https://saasforgekit.com/
- Documentation: https://saasforgekit.com/documentation
- Demo: https://demo.saasforgekit.com

## Tech Stack

- PHP 8.4+
- Laravel 12
- Inertia.js v2 + React + TypeScript
- Tailwind CSS v4
- Laravel Cashier (Stripe)
- Stancl Tenancy (single DB mode)
- Pest

## Quick Start

### 1) Prerequisites

- PHP 8.4+
- Composer
- Node.js 20+ and npm
- SQLite (default) or MySQL/PostgreSQL

### 2) Install dependencies and bootstrap app

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

### 3) Configure database

Default `.env.example` uses SQLite:

```env
DB_CONNECTION=sqlite
```

Or switch `DB_*` values in `.env` for MySQL/PostgreSQL.

### 4) Run migrations and seed admin

```bash
php artisan migrate
php artisan db:seed --class=AdminRoleSeeder
```

Admin seed credentials:

- email: `admin@admin.com`
- password: `password`

### 5) Start development

Run backend + queue + logs + Vite together:

```bash
composer run dev
```

Or run only Vite in another terminal if you already run PHP server separately:

```bash
npm run dev
```

### 6) Build and test

```bash
npm run build
php artisan test
```

## Stripe Setup

Set in `.env`:

```env
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
```

For local webhooks:

```bash
stripe listen --forward-to http://127.0.0.1:8000/stripe/webhook
```

## License

MIT
