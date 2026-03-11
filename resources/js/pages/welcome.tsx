import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChevronRight,
    CreditCard,
    KeyRound,
    LayoutDashboard,
    Menu,
    Moon,
    Rocket,
    Shield,
    Star,
    Sun,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import AppLogoIcon from '@/components/app-logo-icon';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, login, register } from '@/routes';

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

type Props = {
    canRegister?: boolean;
    plans: Plan[];
};

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

function featureIndex(key: string): number {
    const match = key.match(/^feature_(\d+)$/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}
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

const features = [
    {
        icon: Users,
        title: 'Focused Ownership',
        description:
            'Each account runs in its own tenant context, with clear ownership and isolated data from day one.',
        bg: 'bg-violet-100 dark:bg-violet-950',
        text: 'text-violet-600 dark:text-violet-400',
    },
    {
        icon: CreditCard,
        title: 'Flexible Billing',
        description:
            'Simple subscription management with transparent pricing. Upgrade, downgrade, or cancel at any time — no surprises.',
        bg: 'bg-blue-100 dark:bg-blue-950',
        text: 'text-blue-600 dark:text-blue-400',
    },
    {
        icon: LayoutDashboard,
        title: 'Powerful Dashboard',
        description:
            "Get a bird's-eye view of everything that matters. Track key metrics, monitor progress, and make data-driven decisions.",
        bg: 'bg-emerald-100 dark:bg-emerald-950',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        icon: KeyRound,
        title: 'Secure by Default',
        description:
            'Industry-standard authentication with two-factor verification, encrypted data, and automatic session management.',
        bg: 'bg-amber-100 dark:bg-amber-950',
        text: 'text-amber-600 dark:text-amber-400',
    },
    {
        icon: Shield,
        title: 'Access Controls',
        description:
            'Fine-grained permissions let you control exactly who can see and do what across your entire organization.',
        bg: 'bg-pink-100 dark:bg-pink-950',
        text: 'text-pink-600 dark:text-pink-400',
    },
    {
        icon: Rocket,
        title: 'Built for Speed',
        description:
            'Blazing-fast performance with a modern architecture designed to scale as your business grows.',
        bg: 'bg-indigo-100 dark:bg-indigo-950',
        text: 'text-indigo-600 dark:text-indigo-400',
    },
];

const testimonials = [
    {
        name: 'Sarah Chen',
        role: 'CTO at TechFlow',
        quote: 'This platform completely changed how our team operates. The analytics alone saved us 20 hours per week.',
        rating: 5,
    },
    {
        name: 'Marcus Rodriguez',
        role: 'Founder at ScaleUp',
        quote: 'The best investment we made this year. Setup took minutes and our team was productive from day one.',
        rating: 5,
    },
    {
        name: 'Emily Watson',
        role: 'VP Engineering at CloudBase',
        quote: 'Finally a product that combines power with simplicity. The integrations are seamless and support is top-notch.',
        rating: 5,
    },
];

const faqs = [
    {
        question: 'How do I get started?',
        answer: "Simply create an account, choose your plan, and you're ready to go. Our setup process takes just a few minutes and you'll be up and running in no time.",
    },
    {
        question: 'Can I change my plan later?',
        answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences.",
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards and process payments securely. For enterprise plans, we also support invoicing.',
    },
    {
        question: 'How secure is my data?',
        answer: 'Security is our top priority. We use industry-standard encryption, regular backups, and follow best practices to keep your data safe and private.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: "Yes, you can cancel your subscription at any time with no questions asked. You'll retain access until the end of your current billing period.",
    },
];

function Navbar({
    canRegister,
    isAuthenticated,
    appName,
    appLogo,
}: {
    canRegister: boolean;
    isAuthenticated: boolean;
    appName: string;
    appLogo: string | null;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleTheme = () =>
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');

    return (
        <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-white/70 backdrop-blur-xl dark:bg-gray-950/70">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <a href="#" className="flex min-w-0 items-center gap-2">
                    {appLogo ? (
                        <img
                            src={appLogo}
                            alt={appName}
                            className="size-8 object-contain"
                        />
                    ) : (
                        <div className="flex aspect-square size-8 items-center justify-center">
                            <AppLogoIcon className="size-8" />
                        </div>
                    )}
                    <span className="max-w-[140px] truncate text-base font-bold text-gray-900 sm:max-w-none sm:text-lg dark:text-white">
                        {appName}
                    </span>
                </a>

                <nav className="hidden items-center gap-8 md:flex">
                    <a
                        href="#features"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Features
                    </a>
                    <a
                        href="#pricing"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Pricing
                    </a>
                    <a
                        href="#testimonials"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        Testimonials
                    </a>
                    <a
                        href="#faq"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                        FAQ
                    </a>
                </nav>

                <div className="hidden items-center gap-3 md:flex">
                    <button
                        onClick={toggleTheme}
                        className="flex size-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {resolvedAppearance === 'dark' ? (
                            <Sun className="size-5" />
                        ) : (
                            <Moon className="size-5" />
                        )}
                    </button>
                    {isAuthenticated ? (
                        <Button asChild>
                            <Link href={dashboard()}>Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" asChild>
                                <Link href={login()}>Log in</Link>
                            </Button>
                            {canRegister && (
                                <Button
                                    asChild
                                    className="bg-violet-600 text-white shadow-sm hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                                >
                                    <Link href={register()}>Get Started</Link>
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1 md:hidden">
                    <button
                        onClick={toggleTheme}
                        className="flex size-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        {resolvedAppearance === 'dark' ? (
                            <Sun className="size-5" />
                        ) : (
                            <Moon className="size-5" />
                        )}
                    </button>
                    <button
                        className="flex size-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? (
                            <X className="size-5" />
                        ) : (
                            <Menu className="size-5" />
                        )}
                    </button>
                </div>
            </div>

            {mobileOpen && (
                <div className="border-t border-gray-200/50 bg-white/95 backdrop-blur-xl md:hidden dark:border-gray-800 dark:bg-gray-950/95">
                    <div className="space-y-1 px-4 py-4">
                        <a
                            href="#features"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Features
                        </a>
                        <a
                            href="#pricing"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Pricing
                        </a>
                        <a
                            href="#testimonials"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            Testimonials
                        </a>
                        <a
                            href="#faq"
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                            FAQ
                        </a>
                        <div className="flex flex-col gap-2 pt-3">
                            {isAuthenticated ? (
                                <Button asChild className="w-full">
                                    <Link href={dashboard()}>Dashboard</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        asChild
                                        className="w-full"
                                    >
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    {canRegister && (
                                        <Button
                                            asChild
                                            className="w-full bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
                                        >
                                            <Link href={register()}>
                                                Get Started
                                            </Link>
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

function HeroSection({ canRegister }: { canRegister: boolean }) {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-32">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-40 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/30 blur-3xl dark:from-violet-600/20 dark:to-fuchsia-600/20" />
                <div className="absolute top-20 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-3xl dark:from-blue-600/10 dark:to-cyan-600/10" />
                <div className="absolute -bottom-20 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-pink-400/15 to-amber-400/15 blur-3xl dark:from-pink-600/10 dark:to-amber-600/10" />
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-700 sm:text-sm dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
                        <Rocket className="size-4" />
                        The smarter way to work
                    </div>

                    <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
                        Streamline your workflow,{' '}
                        <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
                            grow your business
                        </span>
                    </h1>

                    <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                        The all-in-one platform to manage, automate, and scale
                        your operations. Powerful tools, actionable insights,
                        and seamless integrations — all in one place.
                    </p>

                    <div className="flex w-full flex-col items-stretch justify-center gap-4 sm:w-auto sm:flex-row sm:items-center">
                        {canRegister && (
                            <Button
                                size="lg"
                                asChild
                                className="w-full gap-2 bg-violet-600 px-8 text-white shadow-sm transition-all hover:bg-violet-700 sm:w-auto dark:bg-violet-600 dark:hover:bg-violet-500"
                            >
                                <Link href={register()}>
                                    Get Started
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        )}
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="w-full gap-2 px-8 sm:w-auto"
                        >
                            <a href="#features">
                                See Features
                                <ChevronRight className="size-4" />
                            </a>
                        </Button>
                    </div>

                    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-500 dark:text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <Check className="size-4 text-emerald-500" />
                            Easy setup
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Check className="size-4 text-emerald-500" />
                            No hidden fees
                        </div>
                        <div className="hidden items-center gap-1.5 sm:flex">
                            <Check className="size-4 text-emerald-500" />
                            Cancel anytime
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeaturesSection() {
    return (
        <section id="features" className="relative py-24 lg:py-32">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <Badge
                        variant="secondary"
                        className="mb-4 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
                    >
                        Features
                    </Badge>
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Everything you need to{' '}
                        <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                            succeed
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Packed with powerful features designed to help you work
                        smarter and grow faster.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <Card
                            key={feature.title}
                            className="group relative overflow-hidden border-gray-200/60 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5 dark:border-gray-800 dark:bg-gray-900/50"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-violet-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:to-violet-950/20" />
                            <CardContent className="relative p-6">
                                <div
                                    className={`mb-4 inline-flex size-12 items-center justify-center rounded-xl ${feature.bg}`}
                                >
                                    <feature.icon
                                        className={`size-6 ${feature.text}`}
                                    />
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                                    {feature.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                    {feature.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
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

    const planFeatures = Object.entries(plan.metadata)
        .filter(([key]) => key.startsWith('feature_'))
        .sort(([a], [b]) => featureIndex(a) - featureIndex(b))
        .map(([, value]) => value);

    if (!price) return null;

    const trialEnabled = plan.metadata?.trial_enabled === 'true';
    const trialDays = Number(plan.metadata?.trial_days || 0);
    const trialWithoutCard = plan.metadata?.trial_without_card === 'true';

    return (
        <Card
            className={`relative flex flex-col overflow-hidden transition-all duration-300 ${isPopular ? 'border-violet-500/50 shadow-2xl ring-2 shadow-violet-500/10 ring-violet-500/20 dark:border-violet-500/30' : 'border-gray-200/60 hover:border-violet-300/50 hover:shadow-lg dark:border-gray-800'}`}
        >
            {isPopular && (
                <>
                    <div className="absolute inset-x-0 top-0 h-1 bg-violet-600" />
                    <Badge className="absolute top-3 right-3 bg-violet-600 text-white">
                        Most Popular
                    </Badge>
                </>
            )}
            <CardHeader className="pb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                </h3>
                {plan.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {plan.description}
                    </p>
                )}
                <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        {formatAmount(price.unit_amount, price.currency)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        /{formatInterval(price.interval)}
                    </span>
                    {savings && (
                        <Badge
                            variant="secondary"
                            className="ml-2 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                        >
                            Save {savings}%
                        </Badge>
                    )}
                </div>
                {trialEnabled && trialDays > 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Includes a {trialDays}-day free trial
                        {trialWithoutCard ? ' (no card required)' : ''}.
                    </p>
                )}
            </CardHeader>

            {planFeatures.length > 0 && (
                <CardContent className="flex-1 pt-4">
                    <ul className="space-y-3">
                        {planFeatures.map((feature, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-3 text-sm"
                            >
                                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-600">
                                    <Check className="size-3 text-white" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">
                                    {feature}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            )}

            <CardFooter className="pt-4">
                <Button
                    asChild
                    className={`w-full ${isPopular ? 'bg-violet-600 text-white shadow-sm hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500' : ''}`}
                    variant={isPopular ? 'default' : 'outline'}
                    size="lg"
                >
                    <Link href={register()}>
                        {plan.metadata?.cta || 'Get Started'}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

function PricingSection({ plans }: { plans: Plan[] }) {
    const intervals = useMemo(() => getAvailableIntervals(plans), [plans]);
    const defaultInterval = intervals.includes('month')
        ? 'month'
        : (intervals[0] ?? 'month');
    const [selectedInterval, setSelectedInterval] = useState(defaultInterval);

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
        <section id="pricing" className="relative py-24 lg:py-32">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-violet-50/50 via-fuchsia-50/30 to-transparent dark:from-violet-950/20 dark:via-fuchsia-950/10 dark:to-transparent" />
                <div className="absolute top-1/2 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-violet-200/20 to-pink-200/20 blur-3xl dark:from-violet-900/10 dark:to-pink-900/10" />
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <Badge
                        variant="secondary"
                        className="mb-4 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-300"
                    >
                        Pricing
                    </Badge>
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Simple,{' '}
                        <span className="bg-gradient-to-r from-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
                            transparent
                        </span>{' '}
                        pricing
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Choose the plan that fits your needs. Upgrade or
                        downgrade at any time.
                    </p>
                </div>

                {plans.length === 0 ? (
                    <Card className="mx-auto max-w-md">
                        <CardContent className="py-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">
                                Pricing plans are coming soon. Check back later.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {intervals.length > 1 && (
                            <div className="mb-10">
                                <div className="mx-auto flex w-full max-w-full justify-center overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                    <div className="mx-auto inline-flex min-w-max rounded-xl bg-gray-100/80 p-1 dark:bg-gray-800/80">
                                        <ToggleGroup
                                            type="single"
                                            value={selectedInterval}
                                            onValueChange={(value) => {
                                                if (value)
                                                    setSelectedInterval(value);
                                            }}
                                            className="gap-1"
                                        >
                                            {intervals.map((interval) => (
                                                <ToggleGroupItem
                                                    key={interval}
                                                    value={interval}
                                                    className="rounded-lg px-5 py-2 text-sm font-medium data-[state=on]:bg-white data-[state=on]:shadow-sm dark:data-[state=on]:bg-gray-700"
                                                >
                                                    {intervalLabels[interval] ??
                                                        interval}
                                                    {interval === 'year' && ''}
                                                </ToggleGroupItem>
                                            ))}
                                        </ToggleGroup>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div
                            className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${largeCols}`}
                        >
                            {visiblePlans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    selectedInterval={selectedInterval}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

function TestimonialsSection() {
    return (
        <section id="testimonials" className="relative py-24 lg:py-32">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent" />
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-16 max-w-2xl text-center">
                    <Badge
                        variant="secondary"
                        className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    >
                        Testimonials
                    </Badge>
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Loved by{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                            thousands
                        </span>{' '}
                        of teams
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        See what our customers have to say about their
                        experience.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {testimonials.map((testimonial) => (
                        <Card
                            key={testimonial.name}
                            className="group border-gray-200/60 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900/50"
                        >
                            <CardContent className="p-6">
                                <div className="mb-4 flex gap-1">
                                    {Array.from({
                                        length: testimonial.rating,
                                    }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className="size-4 fill-amber-400 text-amber-400"
                                        />
                                    ))}
                                </div>
                                <blockquote className="mb-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                    &ldquo;{testimonial.quote}&rdquo;
                                </blockquote>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                                        {testimonial.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {testimonial.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {testimonial.role}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FaqSection() {
    return (
        <section id="faq" className="relative pt-24 pb-16 lg:pt-32 lg:pb-20">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10" />
            </div>

            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <Badge
                        variant="secondary"
                        className="mb-4 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                    >
                        FAQ
                    </Badge>
                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Frequently asked{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                            questions
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                        Got questions? We&apos;ve got answers.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                        <AccordionItem
                            key={i}
                            value={`faq-${i}`}
                            className="border-gray-200/60 dark:border-gray-800"
                        >
                            <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:no-underline dark:text-white">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600 dark:text-gray-400">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

function CtaSection({ canRegister }: { canRegister: boolean }) {
    return (
        <section className="relative pt-8 pb-24 lg:pt-12 lg:pb-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-50/80 px-8 py-16 text-center sm:px-16 lg:px-24 dark:border-gray-800 dark:bg-gray-900/50">
                    <div className="pointer-events-none absolute inset-0 -z-10">
                        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-800/10" />
                        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-fuchsia-200/20 blur-3xl dark:bg-fuchsia-800/10" />
                    </div>

                    <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Ready to get started?
                    </h2>
                    <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-400">
                        Join thousands of teams already streamlining their
                        workflow and growing faster.
                    </p>
                    <div className="flex w-full flex-col items-stretch justify-center gap-4 sm:w-auto sm:flex-row sm:items-center">
                        {canRegister && (
                            <Button
                                size="lg"
                                asChild
                                className="w-full gap-2 bg-violet-600 px-8 text-white shadow-sm hover:bg-violet-700 sm:w-auto dark:bg-violet-600 dark:hover:bg-violet-500"
                            >
                                <Link href={register()}>
                                    Get Started
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        )}
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className="w-full gap-2 px-8 sm:w-auto"
                        >
                            <a href="#pricing">View Pricing</a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Footer({
    appName,
    appLogo,
}: {
    appName: string;
    appLogo: string | null;
}) {
    return (
        <footer className="border-t border-gray-200/60 py-12 dark:border-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                    <div className="flex items-center gap-2">
                        {appLogo ? (
                            <img
                                src={appLogo}
                                alt={appName}
                                className="size-7 object-contain"
                            />
                        ) : (
                            <div className="flex aspect-square size-8 items-center justify-center">
                                <AppLogoIcon className="size-8" />
                            </div>
                        )}
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {appName}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <a
                            href="#features"
                            className="transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                            Features
                        </a>
                        <a
                            href="#pricing"
                            className="transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                            Pricing
                        </a>
                        <a
                            href="#faq"
                            className="transition-colors hover:text-gray-900 dark:hover:text-white"
                        >
                            FAQ
                        </a>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        &copy; {new Date().getFullYear()} {appName}. All rights
                        reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}

export default function Welcome({ canRegister = true, plans = [] }: Props) {
    const { auth, name, logo } = usePage().props;
    const isAuthenticated = !!auth.user;
    const appName = (name as string) || 'Acme';
    const appLogo = (logo as string | null) ?? null;

    return (
        <>
            <Head title={`${appName} - Streamline Your Workflow`}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700,800"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative min-h-screen overflow-x-clip bg-white dark:bg-gray-950">
                <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
                    <svg
                        className="absolute inset-0 h-full w-full"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern
                                id="grid"
                                width="40"
                                height="40"
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M 40 0 L 0 0 0 40"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                    className="text-gray-200 dark:text-gray-800/60"
                                />
                            </pattern>
                            <radialGradient
                                id="gridFade"
                                cx="50%"
                                cy="0%"
                                r="80%"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="white"
                                    stopOpacity="1"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="white"
                                    stopOpacity="0"
                                />
                            </radialGradient>
                            <mask id="gridMask">
                                <rect
                                    width="100%"
                                    height="100%"
                                    fill="url(#gridFade)"
                                />
                            </mask>
                        </defs>
                        <rect
                            width="100%"
                            height="100%"
                            fill="url(#grid)"
                            mask="url(#gridMask)"
                        />
                    </svg>
                </div>

                <Navbar
                    canRegister={canRegister}
                    isAuthenticated={isAuthenticated}
                    appName={appName}
                    appLogo={appLogo}
                />
                <HeroSection canRegister={canRegister} />
                <FeaturesSection />
                <PricingSection plans={plans} />
                <TestimonialsSection />
                <FaqSection />
                <CtaSection canRegister={canRegister} />
                <Footer appName={appName} appLogo={appLogo} />
            </div>
        </>
    );
}
