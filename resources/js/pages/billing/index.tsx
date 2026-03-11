import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle,
    CreditCard,
    ExternalLink,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    index,
    checkout,
    portal,
} from '@/actions/App/Http/Controllers/BillingController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type PlanPrice = {
    id: string;
    unit_amount: number;
    currency: string;
    interval: string | null;
    interval_count: number;
    nickname: string | null;
};

type Plan = {
    id: string;
    name: string;
    description: string | null;
    metadata: Record<string, string>;
    prices: PlanPrice[];
};

type Subscription = {
    stripe_status: string;
    stripe_price: string | null;
    plan_name: string | null;
    on_trial: boolean;
    trial_ends_at: string | null;
    on_grace_period: boolean;
    ends_at: string | null;
    active: boolean;
    cancelled: boolean;
    current_price: {
        unit_amount: number;
        currency: string;
        interval: string | null;
    } | null;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string;
    features: string[];
};

type Props = {
    plans: Plan[];
    subscription: Subscription | null;
    on_generic_trial: boolean;
    generic_trial_ends_at: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Billing', href: index().url }];

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
    }).format(amount / 100);
}

const intervalLabels: Record<string, string> = {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
};
const intervalShort: Record<string, string> = {
    day: 'day',
    week: 'week',
    month: 'mo',
    year: 'yr',
};
const intervalOrder: Record<string, number> = {
    day: 0,
    week: 1,
    month: 2,
    year: 3,
};

function featureIndex(key: string): number {
    const match = key.match(/^feature_(\d+)$/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function formatInterval(interval: string | null): string {
    if (!interval) return '';
    return intervalShort[interval] ?? interval;
}

function getAvailableIntervals(plans: Plan[]): string[] {
    const intervals = new Set<string>();
    for (const plan of plans) {
        for (const price of plan.prices) {
            if (price.interval) intervals.add(price.interval);
        }
    }
    return [...intervals].sort(
        (a, b) => (intervalOrder[a] ?? 99) - (intervalOrder[b] ?? 99),
    );
}

function statusVariant(
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'active':
        case 'trialing':
            return 'default';
        case 'past_due':
        case 'unpaid':
            return 'destructive';
        case 'canceled':
        case 'incomplete_expired':
            return 'secondary';
        default:
            return 'outline';
    }
}

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function redirectTo(url: string, data?: Record<string, string>) {
    const response = await axios.post(url, data);
    window.location.href = response.data.url;
}

function daysUntil(dateString: string): number {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) {
        return 0;
    }

    const dayMs = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.floor(diffMs / dayMs));
}

function SubscribeButton({
    price,
    label,
    isPopular,
}: {
    price: PlanPrice;
    label?: string;
    isPopular?: boolean;
}) {
    const [loading, setLoading] = useState(false);

    async function handleCheckout() {
        setLoading(true);
        try {
            await redirectTo(checkout.url(), { price_id: price.id });
        } catch {
            setLoading(false);
        }
    }

    return (
        <Button
            onClick={handleCheckout}
            disabled={loading}
            variant={isPopular ? 'default' : 'outline'}
            className="w-full gap-2"
        >
            {loading ? <Spinner /> : <CreditCard className="size-4" />}
            {label || 'Get Started'}
        </Button>
    );
}

function PlanCard({
    plan,
    selectedInterval,
}: {
    plan: Plan;
    selectedInterval: string;
}) {
    const isPopular = plan.metadata?.popular === 'true';
    const price = plan.prices.find((p) => p.interval === selectedInterval);
    const monthlyPrice = plan.prices.find((p) => p.interval === 'month');

    const savings = useMemo(() => {
        if (selectedInterval !== 'year' || !price || !monthlyPrice) return null;
        const yearlyPerMonth = price.unit_amount / 12;
        const pct = Math.round(
            (1 - yearlyPerMonth / monthlyPrice.unit_amount) * 100,
        );
        return pct > 0 ? pct : null;
    }, [selectedInterval, price, monthlyPrice]);

    const features = Object.entries(plan.metadata)
        .filter(([key]) => key.startsWith('feature_'))
        .sort(([a], [b]) => featureIndex(a) - featureIndex(b))
        .map(([, value]) => value);

    if (!price) return null;

    const trialEnabled = plan.metadata?.trial_enabled === 'true';
    const trialDays = Number(plan.metadata?.trial_days || 0);
    const trialWithoutCard = plan.metadata?.trial_without_card === 'true';

    return (
        <Card
            className={`relative flex flex-col ${isPopular ? 'border-primary shadow-md' : ''}`}
        >
            {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-3">Most Popular</Badge>
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {plan.description && (
                    <CardDescription className="mt-1.5">
                        {plan.description}
                    </CardDescription>
                )}
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                        {formatAmount(price.unit_amount, price.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        /{formatInterval(price.interval)}
                    </span>
                    {savings && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                            Save {savings}%
                        </Badge>
                    )}
                </div>
                {trialEnabled && trialDays > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        Includes a {trialDays}-day free trial
                        {trialWithoutCard ? ' (no card required)' : ''}.
                    </p>
                )}
            </CardHeader>
            {features.length > 0 && (
                <CardContent className="flex-1">
                    <ul className="space-y-2">
                        {features.map((feature, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                            >
                                <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            )}
            <CardFooter>
                <SubscribeButton
                    price={price}
                    label={plan.metadata?.cta}
                    isPopular={isPopular}
                />
            </CardFooter>
        </Card>
    );
}

function PricingGrid({ plans }: { plans: Plan[] }) {
    const intervals = useMemo(() => getAvailableIntervals(plans), [plans]);
    const defaultInterval = intervals.includes('month')
        ? 'month'
        : (intervals[0] ?? 'month');
    const [selectedInterval, setSelectedInterval] = useState(defaultInterval);

    if (plans.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                        No subscription plans are available yet. Please check
                        back later.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const visiblePlans = plans.filter((plan) =>
        plan.prices.some((p) => p.interval === selectedInterval),
    );

    const planCount = visiblePlans.length;
    const largeCols =
        planCount <= 1
            ? 'lg:grid-cols-1'
            : planCount === 2
              ? 'lg:grid-cols-2'
              : planCount === 3
                ? 'lg:grid-cols-3'
                : planCount === 4
                  ? 'lg:grid-cols-4'
                  : 'lg:grid-cols-5';

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-semibold">Choose your plan</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Select a plan that fits your needs. You can change or cancel
                    anytime.
                </p>
            </div>

            {intervals.length > 1 && (
                <div className="flex justify-center">
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={selectedInterval}
                        onValueChange={(value) => {
                            if (value) setSelectedInterval(value);
                        }}
                    >
                        {intervals.map((interval) => (
                            <ToggleGroupItem
                                key={interval}
                                value={interval}
                                className="px-4"
                            >
                                {intervalLabels[interval] ?? interval}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                </div>
            )}

            <div
                className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${largeCols}`}
            >
                {visiblePlans.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        selectedInterval={selectedInterval}
                    />
                ))}
            </div>
        </div>
    );
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
    const [loading, setLoading] = useState(false);

    async function handlePortal() {
        setLoading(true);
        await redirectTo(portal.url());
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">
                            {subscription.plan_name
                                ? `${subscription.plan_name} Plan`
                                : 'Current Subscription'}
                        </CardTitle>
                        {subscription.current_price && (
                            <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-2xl font-bold tracking-tight">
                                    {formatAmount(
                                        subscription.current_price.unit_amount,
                                        subscription.current_price.currency,
                                    )}
                                </span>
                                {subscription.current_price.interval && (
                                    <span className="text-sm text-muted-foreground">
                                        /
                                        {formatInterval(
                                            subscription.current_price.interval,
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <Badge variant={statusVariant(subscription.stripe_status)}>
                        {formatStatus(subscription.stripe_status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {subscription.on_trial && subscription.trial_ends_at && (
                    <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
                        <CheckCircle className="size-4 text-primary" />
                        <span>
                            Trial ends in{' '}
                            {daysUntil(subscription.trial_ends_at)} days
                        </span>
                    </div>
                )}
                {subscription.cancelled &&
                    subscription.on_grace_period &&
                    subscription.ends_at && (
                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm">
                            <XCircle className="size-4 text-destructive" />
                            <span>
                                Cancelled — access until{' '}
                                {formatDate(subscription.ends_at)}
                            </span>
                        </div>
                    )}

                <div className="grid gap-3 text-sm">
                    {subscription.current_period_start &&
                        subscription.current_period_end && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarDays className="size-4" />
                                    Current period
                                </span>
                                <span>
                                    {formatDate(
                                        subscription.current_period_start,
                                    )}{' '}
                                    —{' '}
                                    {formatDate(
                                        subscription.current_period_end,
                                    )}
                                </span>
                            </div>
                        )}
                    {subscription.current_period_end &&
                        !subscription.cancelled && (
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CreditCard className="size-4" />
                                    Next billing date
                                </span>
                                <span>
                                    {formatDate(
                                        subscription.current_period_end,
                                    )}
                                </span>
                            </div>
                        )}
                    {subscription.created_at && (
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle className="size-4" />
                                Member since
                            </span>
                            <span>{formatDate(subscription.created_at)}</span>
                        </div>
                    )}
                </div>

                {subscription.features.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Included in your plan
                            </p>
                            <ul className="grid gap-1.5">
                                {subscription.features.map((feature, i) => (
                                    <li
                                        key={i}
                                        className="flex items-start gap-2 text-sm"
                                    >
                                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={handlePortal}
                    disabled={loading}
                    className="gap-2"
                >
                    {loading ? (
                        <Spinner />
                    ) : (
                        <ExternalLink className="size-4" />
                    )}
                    Manage Billing
                </Button>
            </CardFooter>
        </Card>
    );
}

function PastSubscriptionBanner({
    subscription,
}: {
    subscription: Subscription;
}) {
    const [loading, setLoading] = useState(false);

    async function handlePortal() {
        setLoading(true);
        await redirectTo(portal.url());
    }

    const statusMessage =
        subscription.stripe_status === 'canceled'
            ? 'Your subscription has been cancelled.'
            : `Your subscription status is ${formatStatus(subscription.stripe_status).toLowerCase()}.`;

    return (
        <Card className="border-muted">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">
                            {subscription.plan_name
                                ? `${subscription.plan_name} Plan`
                                : 'Previous Subscription'}{' '}
                            &mdash;{' '}
                            <span className="text-muted-foreground">
                                {statusMessage}
                            </span>
                        </p>
                        {subscription.ends_at && (
                            <p className="text-muted-foreground">
                                Ended on {formatDate(subscription.ends_at)}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePortal}
                    disabled={loading}
                    className="shrink-0 gap-2"
                >
                    {loading ? (
                        <Spinner />
                    ) : (
                        <ExternalLink className="size-4" />
                    )}
                    View Billing History
                </Button>
            </CardContent>
        </Card>
    );
}

function GenericTrialBanner({ endsAt }: { endsAt: string }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <CheckCircle className="size-4 text-primary" />
            <span>
                You are on a free trial — {daysUntil(endsAt)} days remaining.
            </span>
        </div>
    );
}

function CheckoutResult() {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');

    if (!checkoutStatus) return null;

    const isSuccess = checkoutStatus === 'success';

    return (
        <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${isSuccess ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'}`}
        >
            {isSuccess ? (
                <>
                    <CheckCircle className="size-4" />
                    <span>Subscription activated successfully.</span>
                </>
            ) : (
                <>
                    <XCircle className="size-4" />
                    <span>
                        Checkout was cancelled. You can try again anytime.
                    </span>
                </>
            )}
        </div>
    );
}

export default function Billing({
    plans,
    subscription,
    on_generic_trial,
    generic_trial_ends_at,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Billing" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                {subscription?.active && (
                    <Heading
                        title="Billing"
                        description="Manage your subscription and billing details."
                    />
                )}

                <CheckoutResult />

                {on_generic_trial && generic_trial_ends_at && (
                    <GenericTrialBanner endsAt={generic_trial_ends_at} />
                )}

                {subscription?.active ? (
                    <SubscriptionCard subscription={subscription} />
                ) : (
                    <PricingGrid plans={plans} />
                )}

                {subscription && !subscription.active && (
                    <PastSubscriptionBanner subscription={subscription} />
                )}
            </div>
        </AppLayout>
    );
}
