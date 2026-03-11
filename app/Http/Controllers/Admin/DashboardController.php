<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\User;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private CarbonInterface $startDate;

    private CarbonInterface $endDate;

    private CarbonInterface $previousStart;

    private ?int $planId;

    public function __invoke(Request $request): Response
    {
        $range = $request->input('range', '30d');
        $this->planId = $request->filled('plan') ? (int) $request->input('plan') : null;

        if ($range === 'custom' && $request->filled('from') && $request->filled('to')) {
            $this->startDate = Carbon::parse($request->input('from'))->startOfDay();
            $this->endDate = Carbon::parse($request->input('to'))->endOfDay();
            $rangeDays = (int) $this->startDate->diffInDays($this->endDate);
            $this->previousStart = $this->startDate->copy()->subDays($rangeDays)->startOfDay();
        } else {
            if ($range === 'custom') {
                $range = '30d';
            }

            $rangeDays = match ($range) {
                '7d' => 7,
                '30d' => 30,
                '3m' => 90,
                '12m' => 365,
                default => 30,
            };

            $this->startDate = now()->subDays($rangeDays)->startOfDay();
            $this->endDate = now()->endOfDay();
            $this->previousStart = now()->subDays($rangeDays * 2)->startOfDay();
        }

        $effectiveRange = $range === 'custom' ? $this->resolveCustomRange($rangeDays) : $range;

        $stats = $this->buildStats($rangeDays);
        $signupChart = $this->buildSignupChart($effectiveRange);
        $revenueChart = $this->buildRevenueChart($effectiveRange);
        $planDistribution = $this->buildPlanDistribution();
        $subscriptionStatuses = $this->buildSubscriptionStatuses();
        $recentSignups = $this->buildRecentSignups();

        $plans = Plan::active()->ordered()->get(['id', 'name']);

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'signupChart' => $signupChart,
            'revenueChart' => $revenueChart,
            'planDistribution' => $planDistribution,
            'subscriptionStatuses' => $subscriptionStatuses,
            'recentSignups' => $recentSignups,
            'plans' => $plans,
            'filters' => [
                'range' => $range,
                'plan' => $this->planId,
                'from' => $range === 'custom' ? $request->input('from') : null,
                'to' => $range === 'custom' ? $request->input('to') : null,
            ],
        ]);
    }

    private function buildStats(int $rangeDays): array
    {
        $totalUsers = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->whereBetween('created_at', [$this->startDate, $this->endDate])
            ->count();

        $subscriptionQuery = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereBetween('created_at', [$this->startDate, $this->endDate]);
        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $subscriptionQuery->whereIn('stripe_price', $priceIds);
        }
        $activeSubscriptions = $subscriptionQuery->count();

        $mrr = $this->calculateMrr();

        $newSignups = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->whereBetween('created_at', [$this->startDate, $this->endDate])
            ->count();

        $prevUsers = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->whereBetween('created_at', [$this->previousStart, $this->startDate])
            ->count();

        $prevSubscriptions = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereBetween('created_at', [$this->previousStart, $this->startDate]);
        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $prevSubscriptions->whereIn('stripe_price', $priceIds);
        }
        $prevSubscriptions = $prevSubscriptions->count();

        $prevSignups = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->whereBetween('created_at', [$this->previousStart, $this->startDate])
            ->count();

        $prevMrr = $this->calculateMrrForPeriod($this->previousStart, $this->startDate);

        return [
            'totalTenants' => $totalUsers,
            'totalUsers' => $totalUsers,
            'activeSubscriptions' => $activeSubscriptions,
            'mrr' => $mrr,
            'newSignups' => $newSignups,
            'totalTenantsTrend' => $this->trend($totalUsers, $prevUsers),
            'totalUsersTrend' => $this->trend($totalUsers, $prevUsers),
            'activeSubscriptionsTrend' => $this->trend($activeSubscriptions, $prevSubscriptions),
            'mrrTrend' => $this->trend($mrr, $prevMrr),
            'newSignupsTrend' => $this->trend($newSignups, $prevSignups),
        ];
    }

    private function trend(int|float $current, int|float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function resolveCustomRange(int $days): string
    {
        if ($days <= 60) {
            return '30d';
        }

        return '12m';
    }

    private function buildSignupChart(string $range): array
    {
        $format = $this->dateFormat($range);
        $driver = DB::getDriverName();

        $dateExpr = match ($driver) {
            'sqlite' => "strftime('{$format}', created_at)",
            default => "DATE_FORMAT(created_at, '{$this->mysqlFormat($format)}')",
        };

        $signups = User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->whereBetween('created_at', [$this->startDate, $this->endDate])
            ->selectRaw("{$dateExpr} as date, COUNT(*) as count")
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date');

        $periods = $this->generatePeriods($range);

        return $periods->map(fn (string $date) => [
            'date' => $date,
            'count' => $signups[$date] ?? 0,
        ])->values()->all();
    }

    private function buildRevenueChart(string $range): array
    {
        $periods = $this->generatePeriods($range);

        $subscriptionQuery = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereBetween('created_at', [$this->startDate, $this->endDate])
            ->whereNotNull('stripe_price');

        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $subscriptionQuery->whereIn('stripe_price', $priceIds);
        }

        $subscriptions = $subscriptionQuery->get(['stripe_price', 'created_at']);
        $prices = PlanPrice::all()->keyBy('stripe_id');

        $cumulativeByDate = [];
        foreach ($subscriptions as $sub) {
            $subDate = Carbon::parse($sub->created_at);
            $price = $prices[$sub->stripe_price] ?? null;
            if (! $price) {
                continue;
            }

            $monthly = match ($price->interval) {
                'month' => $price->unit_amount,
                'year' => (int) round($price->unit_amount / 12),
                'week' => $price->unit_amount * 4,
                default => $price->unit_amount,
            };

            foreach ($periods as $period) {
                $periodDate = $this->parsePeriodDate($period, $range);
                if ($subDate->lte($periodDate)) {
                    $cumulativeByDate[$period] = ($cumulativeByDate[$period] ?? 0) + $monthly;
                }
            }
        }

        $baseMrr = $this->calculateMrrBefore($this->startDate);

        return $periods->map(fn (string $date) => [
            'date' => $date,
            'mrr' => $baseMrr + ($cumulativeByDate[$date] ?? 0),
        ])->values()->all();
    }

    private function buildPlanDistribution(): array
    {
        $activeSubs = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereNotNull('stripe_price')
            ->pluck('stripe_price');

        if ($activeSubs->isEmpty()) {
            return [];
        }

        $prices = PlanPrice::with('plan')
            ->whereIn('stripe_id', $activeSubs)
            ->get()
            ->keyBy('stripe_id');

        $distribution = [];
        foreach ($activeSubs as $stripePriceId) {
            $price = $prices[$stripePriceId] ?? null;
            $planName = $price?->plan?->name ?? 'Unknown';
            $distribution[$planName] = ($distribution[$planName] ?? 0) + 1;
        }

        return collect($distribution)
            ->map(fn (int $count, string $name) => ['name' => $name, 'count' => $count])
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    private function buildSubscriptionStatuses(): array
    {
        $statuses = DB::table('subscriptions')
            ->selectRaw('stripe_status as status, COUNT(*) as count')
            ->groupBy('stripe_status')
            ->pluck('count', 'status');

        $order = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused', 'unpaid'];

        return collect($order)
            ->filter(fn (string $status) => ($statuses[$status] ?? 0) > 0)
            ->map(fn (string $status) => [
                'status' => $status,
                'count' => $statuses[$status],
            ])
            ->values()
            ->all();
    }

    private function buildRecentSignups(): array
    {
        return User::query()
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'admin'))
            ->with('tenant')
            ->latest()
            ->take(5)
            ->get()
            ->map(function (User $user) {
                $subscription = $user->tenant?->subscription();
                $planName = null;

                if ($subscription?->stripe_price) {
                    $planPrice = PlanPrice::with('plan')
                        ->where('stripe_id', $subscription->stripe_price)
                        ->first();
                    $planName = $planPrice?->plan?->name;
                }

                return [
                    'id' => $user->id,
                    'user' => [
                        'name' => $user->name,
                        'email' => $user->email,
                    ],
                    'plan_name' => $planName,
                    'created_at' => $user->created_at->toISOString(),
                ];
            })
            ->all();
    }

    private function calculateMrr(): int
    {
        $query = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereBetween('created_at', [$this->startDate, $this->endDate])
            ->whereNotNull('stripe_price');

        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $query->whereIn('stripe_price', $priceIds);
        }

        return $this->sumMrr($query->pluck('stripe_price'));
    }

    private function calculateMrrForPeriod(CarbonInterface $from, CarbonInterface $to): int
    {
        $query = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull('stripe_price');

        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $query->whereIn('stripe_price', $priceIds);
        }

        return $this->sumMrr($query->pluck('stripe_price'));
    }

    private function sumMrr(Collection $activePriceIds): int
    {
        if ($activePriceIds->isEmpty()) {
            return 0;
        }

        $prices = PlanPrice::whereIn('stripe_id', $activePriceIds)->get();

        return $activePriceIds->sum(function (string $stripePriceId) use ($prices) {
            $price = $prices->firstWhere('stripe_id', $stripePriceId);

            if (! $price) {
                return 0;
            }

            return match ($price->interval) {
                'month' => $price->unit_amount,
                'year' => (int) round($price->unit_amount / 12),
                'week' => $price->unit_amount * 4,
                default => $price->unit_amount,
            };
        });
    }

    private function calculateMrrBefore(CarbonInterface $before): int
    {
        $query = DB::table('subscriptions')
            ->where('stripe_status', 'active')
            ->whereNotNull('stripe_price')
            ->where('created_at', '<', $before);

        if ($this->planId) {
            $priceIds = PlanPrice::where('plan_id', $this->planId)->pluck('stripe_id');
            $query->whereIn('stripe_price', $priceIds);
        }

        return $this->sumMrr($query->pluck('stripe_price'));
    }

    private function dateFormat(string $range): string
    {
        return match ($range) {
            '7d', '30d' => '%Y-%m-%d',
            default => '%Y-%m',
        };
    }

    private function mysqlFormat(string $sqliteFormat): string
    {
        return $sqliteFormat;
    }

    private function generatePeriods(string $range): Collection
    {
        $interval = match ($range) {
            '7d', '30d' => '1 day',
            default => '1 month',
        };

        $format = match ($range) {
            '7d', '30d' => 'Y-m-d',
            default => 'Y-m',
        };

        $isMonthly = ! in_array($range, ['7d', '30d']);
        $start = $isMonthly ? $this->startDate->copy()->startOfMonth() : $this->startDate;

        return collect(CarbonPeriod::create($start, $interval, $this->endDate))
            ->map(fn (CarbonInterface $date) => $date->format($format));
    }

    private function parsePeriodDate(string $period, string $range): CarbonInterface
    {
        return match ($range) {
            '7d', '30d' => Carbon::parse($period)->endOfDay(),
            default => Carbon::parse($period . '-01')->endOfMonth(),
        };
    }
}
