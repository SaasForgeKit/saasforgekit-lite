import { Head, Link, router } from '@inertiajs/react';
import { subDays } from 'date-fns';
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    CreditCard,
    DollarSign,
    Eye,
    Maximize2,
    Minimize2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { PieLabelRenderProps } from 'recharts';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import DashboardAction from '@/actions/App/Http/Controllers/Admin/DashboardController';
import { show } from '@/actions/App/Http/Controllers/Admin/UserController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type PlanOption = {
    id: number;
    name: string;
};

type SignupPoint = {
    date: string;
    count: number;
};

type RevenuePoint = {
    date: string;
    mrr: number;
};

type PlanDistributionItem = {
    name: string;
    count: number;
};

type SubscriptionStatusItem = {
    status: string;
    count: number;
};

type RecentSignup = {
    id: number;
    user: { name: string; email: string } | null;
    plan_name: string | null;
    created_at: string;
};

type Props = {
    stats: {
        totalTenants: number;
        totalUsers: number;
        activeSubscriptions: number;
        mrr: number;
        newSignups: number;
        totalTenantsTrend: number;
        totalUsersTrend: number;
        activeSubscriptionsTrend: number;
        mrrTrend: number;
        newSignupsTrend: number;
    };
    signupChart: SignupPoint[];
    revenueChart: RevenuePoint[];
    planDistribution: PlanDistributionItem[];
    subscriptionStatuses: SubscriptionStatusItem[];
    recentSignups: RecentSignup[];
    plans: PlanOption[];
    filters: {
        range: string;
        plan: number | null;
        from: string | null;
        to: string | null;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: '/admin/dashboard' },
];

const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

const RANGE_OPTIONS = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '3m', label: 'Last 3 months' },
    { value: '12m', label: 'Last 12 months' },
    { value: 'custom', label: 'Custom range' },
];

const TICK_STYLE = { fontSize: 12, fontFamily: 'var(--font-sans)' };
const DASHBOARD_FILTERS_STORAGE_KEY = 'admin-dashboard-filters';

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    trialing: 'Trialing',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
    paused: 'Paused',
    unpaid: 'Unpaid',
};

function formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amountInCents / 100);
}

function TrendBadge({ value }: { value: number }) {
    if (value === 0) {
        return (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
                <ArrowRight className="size-3" />
                0%
            </span>
        );
    }

    const isPositive = value > 0;

    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
            }`}
        >
            {isPositive ? (
                <ArrowUp className="size-3" />
            ) : (
                <ArrowDown className="size-3" />
            )}
            {Math.abs(value)}%
        </span>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    trend,
}: {
    title: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: number;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend !== undefined && (
                    <div className="mt-1">
                        <TrendBadge value={trend} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ExpandableChartCard({
    title,
    expanded,
    onToggle,
    children,
}: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Card className={expanded ? 'lg:col-span-2' : ''}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={onToggle}
                >
                    {expanded ? (
                        <Minimize2 className="size-4" />
                    ) : (
                        <Maximize2 className="size-4" />
                    )}
                </Button>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function ChartTooltipContent({
    active,
    payload,
    label,
    formatter,
}: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
    formatter?: (value: number) => string;
}) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
            <p className="mb-1 text-xs text-muted-foreground">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="text-sm font-medium">
                    {formatter ? formatter(entry.value) : entry.value}
                </p>
            ))}
        </div>
    );
}

function toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getPersistedFilters(): Record<string, string> | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as {
            range?: string;
            plan?: string;
            from?: string;
            to?: string;
        };

        const params: Record<string, string> = {};
        if (typeof parsed.range === 'string' && parsed.range.length > 0)
            params.range = parsed.range;
        if (typeof parsed.plan === 'string' && parsed.plan.length > 0)
            params.plan = parsed.plan;
        if (typeof parsed.from === 'string' && parsed.from.length > 0)
            params.from = parsed.from;
        if (typeof parsed.to === 'string' && parsed.to.length > 0)
            params.to = parsed.to;

        return Object.keys(params).length > 0 ? params : null;
    } catch {
        return null;
    }
}

function saveFilters(params: {
    range: string;
    plan: number | null;
    from: string | null;
    to: string | null;
}) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(
        DASHBOARD_FILTERS_STORAGE_KEY,
        JSON.stringify({
            range: params.range,
            plan: params.plan?.toString() ?? '',
            from: params.from ?? '',
            to: params.to ?? '',
        }),
    );
}

function FilterBar({
    filters,
    plans,
}: {
    filters: Props['filters'];
    plans: PlanOption[];
}) {
    const initializedFilterPersistence = useRef(false);
    const [showCustom, setShowCustom] = useState(filters.range === 'custom');

    const initialRange: DateRange = {
        from: filters.from
            ? new Date(filters.from + 'T00:00:00')
            : subDays(new Date(), 30),
        to: filters.to ? new Date(filters.to + 'T00:00:00') : new Date(),
    };
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        initialRange,
    );

    useEffect(() => {
        if (
            initializedFilterPersistence.current ||
            typeof window === 'undefined'
        ) {
            return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const hasUrlFilters = ['range', 'plan', 'from', 'to'].some((key) =>
            searchParams.has(key),
        );
        if (hasUrlFilters) {
            initializedFilterPersistence.current = true;
            return;
        }

        const persisted = getPersistedFilters();
        if (!persisted) {
            initializedFilterPersistence.current = true;
            return;
        }

        const currentFilters = {
            range: filters.range,
            plan: filters.plan?.toString() ?? '',
            from: filters.from ?? '',
            to: filters.to ?? '',
        };

        const isAlreadyApplied = Object.entries(persisted).every(
            ([key, value]) => {
                const currentValue =
                    currentFilters[key as keyof typeof currentFilters];
                return currentValue === value;
            },
        );

        if (isAlreadyApplied) {
            initializedFilterPersistence.current = true;
            return;
        }

        router.get(DashboardAction.url(), persisted, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [filters]);

    useEffect(() => {
        if (!initializedFilterPersistence.current) {
            initializedFilterPersistence.current = true;
            return;
        }

        saveFilters(filters);
    }, [filters]);

    function navigate(params: Record<string, string>) {
        const cleaned = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v),
        );
        router.get(DashboardAction.url(), cleaned, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function onRangeChange(value: string) {
        if (value === 'custom') {
            setShowCustom(true);
            if (dateRange?.from && dateRange?.to) {
                navigate({
                    range: 'custom',
                    from: toDateString(dateRange.from),
                    to: toDateString(dateRange.to),
                    plan: filters.plan?.toString() ?? '',
                });
            }
            return;
        }

        setShowCustom(false);
        navigate({ range: value, plan: filters.plan?.toString() ?? '' });
    }

    function onDateRangeChange(range: DateRange | undefined) {
        setDateRange(range);
        if (range?.from && range?.to) {
            navigate({
                range: 'custom',
                from: toDateString(range.from),
                to: toDateString(range.to),
                plan: filters.plan?.toString() ?? '',
            });
        }
    }

    function onPlanChange(value: string) {
        const params: Record<string, string> = {
            range: showCustom ? 'custom' : filters.range,
            plan: value === 'all' ? '' : value,
        };
        if (showCustom && dateRange?.from && dateRange?.to) {
            params.from = toDateString(dateRange.from);
            params.to = toDateString(dateRange.to);
        }
        navigate(params);
    }

    return (
        <div className="flex flex-wrap items-center gap-3">
            <Select
                value={showCustom ? 'custom' : filters.range}
                onValueChange={onRangeChange}
            >
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                    {RANGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showCustom && (
                <DateRangePicker
                    value={dateRange}
                    onChange={onDateRangeChange}
                />
            )}

            <Select
                value={filters.plan?.toString() ?? 'all'}
                onValueChange={onPlanChange}
            >
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export default function AdminDashboard({
    stats,
    signupChart,
    revenueChart,
    planDistribution,
    subscriptionStatuses,
    recentSignups,
    plans,
    filters,
}: Props) {
    const [expanded, setExpanded] = useState<string | null>(null);

    function toggleExpand(key: string) {
        setExpanded((prev) => (prev === key ? null : key));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <Heading
                        title="Dashboard"
                        description="Overview of your application."
                    />
                    <FilterBar filters={filters} plans={plans} />
                </div>

                {/* Stat Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Users"
                        value={stats.totalUsers.toLocaleString()}
                        icon={Users}
                        trend={stats.totalUsersTrend}
                    />
                    <StatCard
                        title="Active Subs"
                        value={stats.activeSubscriptions.toLocaleString()}
                        icon={CreditCard}
                        trend={stats.activeSubscriptionsTrend}
                    />
                    <StatCard
                        title="MRR"
                        value={formatCurrency(stats.mrr)}
                        icon={DollarSign}
                        trend={stats.mrrTrend}
                    />
                    <StatCard
                        title="New Signups"
                        value={stats.newSignups.toLocaleString()}
                        icon={UserPlus}
                        trend={stats.newSignupsTrend}
                    />
                </div>

                {/* Signups + Revenue Charts (side by side) */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <ExpandableChartCard
                        title="Signups"
                        expanded={expanded === 'signups'}
                        onToggle={() => toggleExpand('signups')}
                    >
                        {signupChart.length > 0 ? (
                            <ResponsiveContainer
                                width="100%"
                                height={expanded === 'signups' ? 360 : 260}
                            >
                                <AreaChart
                                    data={signupChart}
                                    margin={{
                                        top: 5,
                                        right: 10,
                                        left: -10,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="signupGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--chart-1)"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--chart-1)"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                    />
                                    <Tooltip
                                        content={<ChartTooltipContent />}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--chart-1)"
                                        fill="url(#signupGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No signup data for this period.
                            </p>
                        )}
                    </ExpandableChartCard>

                    <ExpandableChartCard
                        title="Revenue (MRR)"
                        expanded={expanded === 'revenue'}
                        onToggle={() => toggleExpand('revenue')}
                    >
                        {revenueChart.length > 0 ? (
                            <ResponsiveContainer
                                width="100%"
                                height={expanded === 'revenue' ? 360 : 260}
                            >
                                <LineChart
                                    data={revenueChart}
                                    margin={{
                                        top: 5,
                                        right: 10,
                                        left: -10,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border"
                                    />
                                    <XAxis
                                        dataKey="date"
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                        tickFormatter={(v: number) =>
                                            `$${(v / 100).toFixed(0)}`
                                        }
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(v) =>
                                                    formatCurrency(v)
                                                }
                                            />
                                        }
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="mrr"
                                        stroke="var(--chart-2)"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No revenue data for this period.
                            </p>
                        )}
                    </ExpandableChartCard>
                </div>

                {/* Plan Distribution + Subscription Statuses */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <ExpandableChartCard
                        title="Plan Distribution"
                        expanded={expanded === 'plans'}
                        onToggle={() => toggleExpand('plans')}
                    >
                        {planDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={planDistribution}
                                        dataKey="count"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        label={(props: PieLabelRenderProps) =>
                                            `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                                        }
                                        fontSize={12}
                                        style={{
                                            fontFamily: 'var(--font-sans)',
                                        }}
                                    >
                                        {planDistribution.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    CHART_COLORS[
                                                        i % CHART_COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={<ChartTooltipContent />}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No subscription data available.
                            </p>
                        )}
                    </ExpandableChartCard>

                    <ExpandableChartCard
                        title="Subscription Status"
                        expanded={expanded === 'statuses'}
                        onToggle={() => toggleExpand('statuses')}
                    >
                        {subscriptionStatuses.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={subscriptionStatuses.map((s) => ({
                                        ...s,
                                        label:
                                            STATUS_LABELS[s.status] ?? s.status,
                                    }))}
                                    margin={{
                                        top: 5,
                                        right: 10,
                                        left: -10,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        className="stroke-border"
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={TICK_STYLE}
                                        className="fill-muted-foreground"
                                    />
                                    <Tooltip
                                        content={<ChartTooltipContent />}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {subscriptionStatuses.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    CHART_COLORS[
                                                        i % CHART_COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No subscription data available.
                            </p>
                        )}
                    </ExpandableChartCard>
                </div>

                {/* Recent Signups */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Signups</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentSignups.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="w-[50px]" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentSignups.map((signup) => (
                                            <TableRow key={signup.id}>
                                                <TableCell className="font-medium">
                                                    {signup.user?.name ??
                                                        'No user'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {signup.user?.email ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    {signup.plan_name ? (
                                                        <Badge variant="outline">
                                                            {signup.plan_name}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(
                                                        signup.created_at,
                                                    ).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={show.url(
                                                                signup.id,
                                                            )}
                                                        >
                                                            <Eye className="size-4" />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No signups yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
