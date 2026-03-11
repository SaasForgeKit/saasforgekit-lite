import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    ChevronDown,
    ChevronUp,
    Eye,
    Pencil,
    Plus,
    RotateCcw,
} from 'lucide-react';
import {
    index,
    create,
    show,
    edit,
    destroy,
    update,
    reorder,
} from '@/actions/App/Http/Controllers/Admin/StripePricingController';
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

type Price = {
    id: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string; interval_count: number } | null;
    active: boolean;
    nickname: string | null;
};

type Product = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    created: number;
    display_order: number;
    metadata: Record<string, string>;
    prices: Price[];
};

type Props = {
    products: Product[];
};

function moveProduct(
    activeProducts: Product[],
    fromIndex: number,
    direction: 'up' | 'down',
) {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= activeProducts.length) return;

    const reordered = [...activeProducts];
    [reordered[fromIndex], reordered[toIndex]] = [
        reordered[toIndex],
        reordered[fromIndex],
    ];

    router.post(
        reorder().url,
        { ids: reordered.map((p) => p.id) },
        { preserveScroll: true },
    );
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pricing', href: index().url }];

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

function PriceSummary({ prices }: { prices: Price[] }) {
    const activePrices = prices.filter((p) => p.active);
    if (activePrices.length === 0) {
        return <span className="text-muted-foreground">No active prices</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {activePrices.slice(0, 3).map((price) => (
                <Badge
                    key={price.id}
                    variant="outline"
                    className="font-mono text-xs"
                >
                    {formatAmount(price.unit_amount, price.currency)}
                    {price.recurring && `/${price.recurring.interval}`}
                </Badge>
            ))}
            {activePrices.length > 3 && (
                <Badge variant="outline" className="text-xs">
                    +{activePrices.length - 3} more
                </Badge>
            )}
        </div>
    );
}

export default function PricingIndex({ products }: Props) {
    const activeProducts = products.filter((p) => p.active);
    const archivedProducts = products.filter((p) => !p.active);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pricing" />
            <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Pricing"
                        description="Manage your Stripe subscription products and prices."
                    />
                    <Button asChild>
                        <Link href={create().url}>
                            <Plus className="size-4" />
                            Add Product
                        </Link>
                    </Button>
                </div>

                {products.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">
                                No products configured yet. Create your first
                                product to get started.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {activeProducts.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    Active
                                </h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>
                                                    Description
                                                </TableHead>
                                                <TableHead>Prices</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[140px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeProducts.map(
                                                (product, idx) => (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">
                                                            {product.name}
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                            {product.description ??
                                                                '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <PriceSummary
                                                                prices={
                                                                    product.prices
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="default">
                                                                Active
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-end gap-1">
                                                                {activeProducts.length >
                                                                    1 && (
                                                                    <div className="flex flex-col">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-6"
                                                                            disabled={
                                                                                idx ===
                                                                                0
                                                                            }
                                                                            onClick={() =>
                                                                                moveProduct(
                                                                                    activeProducts,
                                                                                    idx,
                                                                                    'up',
                                                                                )
                                                                            }
                                                                        >
                                                                            <ChevronUp className="size-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-6"
                                                                            disabled={
                                                                                idx ===
                                                                                activeProducts.length -
                                                                                    1
                                                                            }
                                                                            onClick={() =>
                                                                                moveProduct(
                                                                                    activeProducts,
                                                                                    idx,
                                                                                    'down',
                                                                                )
                                                                            }
                                                                        >
                                                                            <ChevronDown className="size-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={show.url(
                                                                            product.id,
                                                                        )}
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </Link>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={edit.url(
                                                                            product.id,
                                                                        )}
                                                                    >
                                                                        <Pencil className="size-4" />
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
                                                                            Archive
                                                                            product
                                                                        </DialogTitle>
                                                                        <DialogDescription>
                                                                            Are
                                                                            you
                                                                            sure
                                                                            you
                                                                            want
                                                                            to
                                                                            archive
                                                                            &ldquo;
                                                                            {
                                                                                product.name
                                                                            }
                                                                            &rdquo;?
                                                                            It
                                                                            will
                                                                            no
                                                                            longer
                                                                            appear
                                                                            as
                                                                            an
                                                                            option
                                                                            for
                                                                            new
                                                                            subscribers.
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
                                                                                onClick={() =>
                                                                                    router.delete(
                                                                                        destroy.url(
                                                                                            product.id,
                                                                                        ),
                                                                                        {
                                                                                            preserveScroll: true,
                                                                                        },
                                                                                    )
                                                                                }
                                                                            >
                                                                                Archive
                                                                            </Button>
                                                                        </DialogFooter>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}

                        {archivedProducts.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground">
                                    Archived
                                </h3>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>
                                                    Description
                                                </TableHead>
                                                <TableHead>Prices</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[80px]" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {archivedProducts.map((product) => (
                                                <TableRow
                                                    key={product.id}
                                                    className="opacity-60"
                                                >
                                                    <TableCell className="font-medium">
                                                        {product.name}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                                        {product.description ??
                                                            '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <PriceSummary
                                                            prices={
                                                                product.prices
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            Archived
                                                        </Badge>
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
                                                                        product.id,
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
                                                                        Reactivate
                                                                        product
                                                                    </DialogTitle>
                                                                    <DialogDescription>
                                                                        Are you
                                                                        sure you
                                                                        want to
                                                                        reactivate
                                                                        &ldquo;
                                                                        {
                                                                            product.name
                                                                        }
                                                                        &rdquo;?
                                                                        It will
                                                                        become
                                                                        available
                                                                        to new
                                                                        subscribers
                                                                        again.
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
                                                                            onClick={() =>
                                                                                router.put(
                                                                                    update.url(
                                                                                        product.id,
                                                                                    ),
                                                                                    {
                                                                                        _reactivate: true,
                                                                                    },
                                                                                    {
                                                                                        preserveScroll: true,
                                                                                    },
                                                                                )
                                                                            }
                                                                        >
                                                                            Reactivate
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
