import { Head, router, usePage } from '@inertiajs/react';
import { Archive, ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    forceDestroy,
    index,
    restore,
    show,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type UserData = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_deactivated: boolean;
    deactivated_at: string | null;
    created_at: string;
    updated_at: string;
};

type TenantData = {
    id: string;
    stripe_id: string | null;
    pm_type: string | null;
    pm_last_four: string | null;
    on_generic_trial: boolean;
    generic_trial_ends_at: string | null;
    created_at: string;
    updated_at: string;
};

type SubscriptionData = {
    stripe_status: string;
    stripe_price: string | null;
    plan_name: string | null;
    price_name: string | null;
    interval: string | null;
    on_trial: boolean;
    trial_ends_at: string | null;
    on_grace_period: boolean;
    ends_at: string | null;
    active: boolean;
    cancelled: boolean;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string;
};

type Props = {
    user: UserData;
    tenant: TenantData | null;
    subscription: SubscriptionData | null;
    stripe_url: string | null;
};

function DetailRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex justify-between gap-4 text-sm">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="text-right">{children}</span>
        </div>
    );
}

function subscriptionStatusBadge(subscription: SubscriptionData) {
    if (subscription.cancelled) {
        return <Badge variant="secondary">Cancelled</Badge>;
    }
    if (subscription.on_trial) {
        return <Badge variant="outline">Trialing</Badge>;
    }
    if (subscription.active) {
        return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">{subscription.stripe_status}</Badge>;
}

function ForceDeleteDialog({ user }: { user: UserData }) {
    const [password, setPassword] = useState('');
    const [processing, setProcessing] = useState(false);
    const errors = usePage().props.errors as Record<string, string>;

    function handleDelete() {
        setProcessing(true);
        router.delete(forceDestroy.url(user.id), {
            data: { password },
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <Dialog onOpenChange={() => setPassword('')}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="size-4" />
                    Delete Permanently
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Permanently delete user</DialogTitle>
                <DialogDescription asChild>
                    <div className="space-y-3">
                        <p>
                            You are about to <strong>permanently delete</strong>{' '}
                            the user <strong>{user.name}</strong> ({user.email}
                            ).
                        </p>
                        <p>This action will:</p>
                        <ul className="list-inside list-disc space-y-1 text-sm">
                            <li>
                                Immediately cancel any active Stripe
                                subscription
                            </li>
                            <li>Permanently delete the user account</li>
                            <li>
                                Remove all data and resources belonging to that
                                user
                            </li>
                        </ul>
                        <p className="font-medium text-destructive">
                            This action is irreversible. All data will be lost
                            and cannot be recovered.
                        </p>
                    </div>
                </DialogDescription>
                <div className="grid gap-2 pt-2">
                    <Label htmlFor="confirm-password">
                        Enter your password to confirm
                    </Label>
                    <Input
                        id="confirm-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your admin password"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && password) handleDelete();
                        }}
                        autoFocus
                    />
                    <InputError message={errors.password} />
                </div>
                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        disabled={!password || processing}
                        onClick={handleDelete}
                    >
                        {processing ? 'Deleting...' : 'Delete Permanently'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ShowUser({
    user,
    tenant,
    subscription,
    stripe_url,
}: Props) {
    const [processing, setProcessing] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Users', href: index().url },
        { title: user.name, href: show.url(user.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={user.name} />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <div className="flex items-start justify-between">
                    <Heading title={user.name} description={user.email} />
                    <div className="flex items-center gap-2">
                        {user.is_deactivated && (
                            <Badge variant="secondary">Deactivated</Badge>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">User Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <DetailRow label="User ID">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                {user.id}
                            </code>
                        </DetailRow>
                        <DetailRow label="Email">{user.email}</DetailRow>
                        <DetailRow label="Email Verified">
                            {user.email_verified_at ? (
                                <Badge variant="outline" className="text-xs">
                                    Verified
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="text-xs">
                                    Unverified
                                </Badge>
                            )}
                        </DetailRow>
                        {user.is_deactivated && user.deactivated_at && (
                            <DetailRow label="Deactivated">
                                {new Date(
                                    user.deactivated_at,
                                ).toLocaleDateString()}
                            </DetailRow>
                        )}
                        <DetailRow label="Created">
                            {new Date(user.created_at).toLocaleDateString()}
                        </DetailRow>
                        <DetailRow label="Last Updated">
                            {new Date(user.updated_at).toLocaleDateString()}
                        </DetailRow>
                    </CardContent>
                </Card>

                {tenant && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Tenant Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <DetailRow label="Tenant ID">
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                    {tenant.id}
                                </code>
                            </DetailRow>
                            {tenant.stripe_id && (
                                <DetailRow label="Stripe Customer ID">
                                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                        {tenant.stripe_id}
                                    </code>
                                </DetailRow>
                            )}
                            {tenant.pm_type && tenant.pm_last_four && (
                                <DetailRow label="Payment Method">
                                    {tenant.pm_type} ending in{' '}
                                    {tenant.pm_last_four}
                                </DetailRow>
                            )}
                            {tenant.on_generic_trial &&
                                tenant.generic_trial_ends_at && (
                                    <DetailRow label="Generic Trial Ends">
                                        {new Date(
                                            tenant.generic_trial_ends_at,
                                        ).toLocaleDateString()}
                                    </DetailRow>
                                )}
                            <DetailRow label="Created">
                                {new Date(
                                    tenant.created_at,
                                ).toLocaleDateString()}
                            </DetailRow>
                            <DetailRow label="Last Updated">
                                {new Date(
                                    tenant.updated_at,
                                ).toLocaleDateString()}
                            </DetailRow>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">
                            Subscription
                        </CardTitle>
                        {stripe_url && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={stripe_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="size-4" />
                                    Stripe Dashboard
                                </a>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {subscription ? (
                            <div className="space-y-2">
                                <DetailRow label="Status">
                                    {subscriptionStatusBadge(subscription)}
                                </DetailRow>
                                {subscription.plan_name && (
                                    <DetailRow label="Plan">
                                        {subscription.plan_name}
                                    </DetailRow>
                                )}
                                {subscription.price_name && (
                                    <DetailRow label="Price">
                                        {subscription.price_name}
                                    </DetailRow>
                                )}
                                {subscription.interval && (
                                    <DetailRow label="Billing Interval">
                                        {subscription.interval
                                            .charAt(0)
                                            .toUpperCase() +
                                            subscription.interval.slice(1)}
                                        ly
                                    </DetailRow>
                                )}
                                {subscription.on_trial &&
                                    subscription.trial_ends_at && (
                                        <DetailRow label="Trial Ends">
                                            {new Date(
                                                subscription.trial_ends_at,
                                            ).toLocaleDateString()}
                                        </DetailRow>
                                    )}
                                {subscription.current_period_start &&
                                    subscription.current_period_end && (
                                        <DetailRow label="Current Period">
                                            {new Date(
                                                subscription.current_period_start,
                                            ).toLocaleDateString()}{' '}
                                            &ndash;{' '}
                                            {new Date(
                                                subscription.current_period_end,
                                            ).toLocaleDateString()}
                                        </DetailRow>
                                    )}
                                {subscription.on_grace_period &&
                                    subscription.ends_at && (
                                        <DetailRow label="Grace Period Ends">
                                            {new Date(
                                                subscription.ends_at,
                                            ).toLocaleDateString()}
                                        </DetailRow>
                                    )}
                                {subscription.stripe_price && (
                                    <DetailRow label="Stripe Price ID">
                                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                            {subscription.stripe_price}
                                        </code>
                                    </DetailRow>
                                )}
                                <DetailRow label="Subscribed Since">
                                    {new Date(
                                        subscription.created_at,
                                    ).toLocaleDateString()}
                                </DetailRow>
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                {tenant?.on_generic_trial
                                    ? 'On generic trial, no subscription yet.'
                                    : 'No active subscription.'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-end gap-2">
                    {user.is_deactivated ? (
                        <>
                            <Dialog key="restore">
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <RotateCcw className="size-4" />
                                        Restore
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogTitle>Restore user</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to restore{' '}
                                        {user.name}? They will be able to log in
                                        and use the application again. You may
                                        need to set up a new subscription for
                                        them.
                                    </DialogDescription>
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button variant="secondary">
                                                Cancel
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            disabled={processing}
                                            onClick={() => {
                                                setProcessing(true);
                                                router.post(
                                                    restore.url(user.id),
                                                    {},
                                                    {
                                                        onFinish: () =>
                                                            setProcessing(
                                                                false,
                                                            ),
                                                    },
                                                );
                                            }}
                                        >
                                            {processing
                                                ? 'Restoring...'
                                                : 'Restore'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <ForceDeleteDialog user={user} />
                        </>
                    ) : (
                        <Dialog key="deactivate">
                            <DialogTrigger asChild>
                                <Button variant="destructive">
                                    <Archive className="size-4" />
                                    Deactivate User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogTitle>Deactivate user</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to deactivate{' '}
                                    {user.name}? Their active subscription will
                                    be cancelled and they will no longer be able
                                    to access the application. You can restore
                                    them later.
                                </DialogDescription>
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        disabled={processing}
                                        onClick={() => {
                                            setProcessing(true);
                                            router.delete(
                                                destroy.url(user.id),
                                                {
                                                    onFinish: () =>
                                                        setProcessing(false),
                                                },
                                            );
                                        }}
                                    >
                                        {processing
                                            ? 'Deactivating...'
                                            : 'Deactivate'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
