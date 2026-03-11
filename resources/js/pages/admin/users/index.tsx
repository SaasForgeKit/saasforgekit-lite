import { Head, Link, router } from '@inertiajs/react';
import { Archive, Eye, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    index,
    restore,
    show,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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

type UserItem = {
    id: number;
    name: string;
    email: string;
    tenant_id: string | null;
    subscription_status: 'active' | 'trialing' | 'inactive';
    plan_name: string | null;
    created_at: string;
    deactivated_at: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedUsers = {
    data: UserItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
};

type Props = {
    users: PaginatedUsers;
    deactivated: UserItem[];
};

const statusConfig = {
    active: { label: 'Active', variant: 'default' as const },
    trialing: { label: 'Trialing', variant: 'outline' as const },
    inactive: { label: 'Inactive', variant: 'secondary' as const },
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users', href: index().url }];

export default function UsersIndex({ users, deactivated }: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <Heading
                    title="Users"
                    description="View and manage all registered users."
                />

                {users.data.length === 0 && deactivated.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">
                                No users registered yet.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {users.data.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    Active
                                </h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Plan</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="w-[80px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.data.map((user) => {
                                                const status =
                                                    statusConfig[
                                                        user.subscription_status
                                                    ];
                                                return (
                                                    <TableRow key={user.id}>
                                                        <TableCell className="font-medium">
                                                            {user.name}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {user.email}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    status.variant
                                                                }
                                                            >
                                                                {status.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {user.plan_name ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {new Date(
                                                                user.created_at,
                                                            ).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={show.url(
                                                                            user.id,
                                                                        )}
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Dialog>
                                                                    <DialogTrigger
                                                                        asChild
                                                                    >
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-8"
                                                                        >
                                                                            <Archive className="size-4" />
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogTitle>
                                                                            Deactivate
                                                                            user
                                                                        </DialogTitle>
                                                                        <DialogDescription>
                                                                            Are
                                                                            you
                                                                            sure
                                                                            you
                                                                            want
                                                                            to
                                                                            deactivate{' '}
                                                                            {
                                                                                user.name
                                                                            }
                                                                            ?
                                                                            Their
                                                                            active
                                                                            subscription
                                                                            will
                                                                            be
                                                                            cancelled
                                                                            and
                                                                            they
                                                                            will
                                                                            no
                                                                            longer
                                                                            be
                                                                            able
                                                                            to
                                                                            access
                                                                            the
                                                                            application.
                                                                            You
                                                                            can
                                                                            restore
                                                                            them
                                                                            later.
                                                                        </DialogDescription>
                                                                        <DialogFooter className="gap-2">
                                                                            <DialogClose
                                                                                asChild
                                                                            >
                                                                                <Button variant="secondary">
                                                                                    Cancel
                                                                                </Button>
                                                                            </DialogClose>
                                                                            <Button
                                                                                variant="destructive"
                                                                                disabled={
                                                                                    processingId ===
                                                                                    user.id
                                                                                }
                                                                                onClick={() => {
                                                                                    setProcessingId(
                                                                                        user.id,
                                                                                    );
                                                                                    router.delete(
                                                                                        destroy.url(
                                                                                            user.id,
                                                                                        ),
                                                                                        {
                                                                                            preserveScroll: true,
                                                                                            onFinish:
                                                                                                () =>
                                                                                                    setProcessingId(
                                                                                                        null,
                                                                                                    ),
                                                                                        },
                                                                                    );
                                                                                }}
                                                                            >
                                                                                {processingId ===
                                                                                user.id
                                                                                    ? 'Deactivating...'
                                                                                    : 'Deactivate'}
                                                                            </Button>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {users.last_page > 1 && (
                            <div className="flex items-center justify-center gap-1">
                                {users.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active ? 'default' : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        asChild={!!link.url && !link.active}
                                    >
                                        {link.url && !link.active ? (
                                            <Link
                                                href={link.url}
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ) : (
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}

                        {users.total > 0 && (
                            <p className="text-center text-sm text-muted-foreground">
                                Showing {users.data.length} of {users.total}{' '}
                                users
                            </p>
                        )}

                        {deactivated.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    Deactivated
                                </h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>
                                                    Deactivated
                                                </TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="w-[80px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deactivated.map((user) => (
                                                <TableRow
                                                    key={user.id}
                                                    className="opacity-60"
                                                >
                                                    <TableCell className="font-medium">
                                                        {user.name}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {user.email}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {user.deactivated_at
                                                            ? new Date(
                                                                  user.deactivated_at,
                                                              ).toLocaleDateString()
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {new Date(
                                                            user.created_at,
                                                        ).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={show.url(
                                                                        user.id,
                                                                    )}
                                                                >
                                                                    <Eye className="size-4" />
                                                                </Link>
                                                            </Button>
                                                            <Dialog>
                                                                <DialogTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                    >
                                                                        <RotateCcw className="size-4" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogTitle>
                                                                        Restore
                                                                        user
                                                                    </DialogTitle>
                                                                    <DialogDescription>
                                                                        Are you
                                                                        sure you
                                                                        want to
                                                                        restore{' '}
                                                                        {
                                                                            user.name
                                                                        }
                                                                        ? They
                                                                        will be
                                                                        able to
                                                                        log in
                                                                        and use
                                                                        the
                                                                        application
                                                                        again.
                                                                        You may
                                                                        need to
                                                                        set up a
                                                                        new
                                                                        subscription
                                                                        for
                                                                        them.
                                                                    </DialogDescription>
                                                                    <DialogFooter className="gap-2">
                                                                        <DialogClose
                                                                            asChild
                                                                        >
                                                                            <Button variant="secondary">
                                                                                Cancel
                                                                            </Button>
                                                                        </DialogClose>
                                                                        <Button
                                                                            disabled={
                                                                                processingId ===
                                                                                user.id
                                                                            }
                                                                            onClick={() => {
                                                                                setProcessingId(
                                                                                    user.id,
                                                                                );
                                                                                router.post(
                                                                                    restore.url(
                                                                                        user.id,
                                                                                    ),
                                                                                    {},
                                                                                    {
                                                                                        preserveScroll: true,
                                                                                        onFinish:
                                                                                            () =>
                                                                                                setProcessingId(
                                                                                                    null,
                                                                                                ),
                                                                                    },
                                                                                );
                                                                            }}
                                                                        >
                                                                            {processingId ===
                                                                            user.id
                                                                                ? 'Restoring...'
                                                                                : 'Restore'}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
