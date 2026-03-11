import { Form, Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    CheckCircle,
    Copy,
    GripVertical,
    Pencil,
    Plus,
    X,
} from 'lucide-react';
import { useState } from 'react';
import {
    store as storePrice,
    update as updatePrice,
    destroy as destroyPrice,
} from '@/actions/App/Http/Controllers/Admin/StripePriceController';
import {
    index,
    show,
    edit,
    updateFeatures,
} from '@/actions/App/Http/Controllers/Admin/StripePricingController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Price = {
    id: string;
    type: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string; interval_count: number } | null;
    active: boolean;
    nickname: string | null;
    created: number;
};

type Product = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    created: number;
    metadata: Record<string, string>;
};

type Props = {
    product: Product;
    prices: Price[];
};

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

function formatInterval(recurring: Price['recurring']): string {
    if (!recurring) return 'One-time';
    const count = recurring.interval_count;
    if (count === 1) return `per ${recurring.interval}`;
    return `every ${count} ${recurring.interval}s`;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleCopy}
        >
            {copied ? (
                <CheckCircle className="size-3.5 text-green-500" />
            ) : (
                <Copy className="size-3.5" />
            )}
        </Button>
    );
}

function PriceRow({ price }: { price: Price }) {
    const [editing, setEditing] = useState(false);
    const [nickname, setNickname] = useState(price.nickname ?? '');
    const [saving, setSaving] = useState(false);

    function handleSave() {
        setSaving(true);
        router.put(
            updatePrice.url(price.id),
            {
                active: price.active,
                nickname: nickname || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onFinish: () => setSaving(false),
            },
        );
    }

    if (editing) {
        return (
            <div className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-medium">
                            {formatAmount(price.unit_amount, price.currency)}
                        </span>
                        <span className="text-muted-foreground">
                            {formatInterval(price.recurring)}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Nickname (e.g. Monthly, Annual)"
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving && <Spinner />}
                            Save
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setEditing(false);
                                setNickname(price.nickname ?? '');
                            }}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                        {formatAmount(price.unit_amount, price.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {formatInterval(price.recurring)}
                    </span>
                    {price.nickname && (
                        <Badge variant="outline" className="text-xs">
                            {price.nickname}
                        </Badge>
                    )}
                    <Badge
                        variant={price.active ? 'default' : 'secondary'}
                        className="text-xs"
                    >
                        {price.active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1 py-0.5">
                        {price.id}
                    </code>
                    <CopyButton text={price.id} />
                </div>
            </div>
            <div className="flex items-center gap-1">
                {price.active && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(true)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Archive className="size-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogTitle>Deactivate price</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to deactivate the{' '}
                                    {formatAmount(
                                        price.unit_amount,
                                        price.currency,
                                    )}{' '}
                                    {formatInterval(price.recurring)} price?
                                    Existing subscribers will not be affected.
                                </DialogDescription>
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        variant="destructive"
                                        onClick={() =>
                                            router.delete(
                                                destroyPrice.url(price.id),
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Deactivate
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </div>
    );
}

function AddPriceForm({ productId }: { productId: string }) {
    const [showForm, setShowForm] = useState(false);

    if (!showForm) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
                className="gap-1.5"
            >
                <Plus className="size-4" />
                Add Price
            </Button>
        );
    }

    return (
        <Form
            action={storePrice.url(productId)}
            method="post"
            onSuccess={() => setShowForm(false)}
            className="space-y-4 rounded-lg border bg-muted/50 p-4"
        >
            {({ processing, errors }) => (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="unit_amount">
                                Amount (in cents)
                            </Label>
                            <Input
                                id="unit_amount"
                                name="unit_amount"
                                type="number"
                                min="1"
                                placeholder="e.g. 1000 for $10.00"
                                required
                                autoFocus
                            />
                            <InputError message={errors.unit_amount} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Input
                                id="currency"
                                name="currency"
                                defaultValue="usd"
                                maxLength={3}
                                required
                            />
                            <InputError message={errors.currency} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="interval">Billing Interval</Label>
                            <select
                                id="interval"
                                name="interval"
                                defaultValue="month"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="day">Daily</option>
                                <option value="week">Weekly</option>
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
                            <InputError message={errors.interval} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nickname">
                                Nickname{' '}
                                <span className="text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="nickname"
                                name="nickname"
                                placeholder="e.g. Monthly, Annual"
                            />
                            <InputError message={errors.nickname} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" size="sm" disabled={processing}>
                            {processing && <Spinner />}
                            Create Price
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}

function extractFeatures(metadata: Record<string, string>): string[] {
    function featureIndex(key: string): number {
        const match = key.match(/^feature_(\d+)$/);
        return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
    }

    return Object.entries(metadata)
        .filter(([key]) => key.startsWith('feature_'))
        .sort(([a], [b]) => featureIndex(a) - featureIndex(b))
        .map(([, value]) => value);
}

function FeaturesCard({
    productId,
    metadata,
}: {
    productId: string;
    metadata: Record<string, string>;
}) {
    const [features, setFeatures] = useState(() => extractFeatures(metadata));
    const [newFeature, setNewFeature] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    function save(
        updated: string[],
        options?: { resetInput?: boolean; fallback?: string[] },
    ) {
        const { resetInput = true, fallback } = options ?? {};
        setSaving(true);
        router.post(
            updateFeatures.url(productId),
            { features: updated },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setFeatures(updated);
                    if (resetInput) {
                        setNewFeature('');
                        setShowInput(false);
                    }
                },
                onError: () => {
                    if (fallback) {
                        setFeatures(fallback);
                    }
                },
                onFinish: () => setSaving(false),
            },
        );
    }

    function addFeature() {
        const trimmed = newFeature.trim();
        if (!trimmed) return;
        save([...features, trimmed]);
    }

    function removeFeature(idx: number) {
        save(features.filter((_, i) => i !== idx));
    }

    function reorderFeatures(fromIndex: number, toIndex: number) {
        if (fromIndex === toIndex) return;

        const previous = [...features];
        const updated = [...features];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);

        setFeatures(updated);
        save(updated, { resetInput: false, fallback: previous });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-base">Features</CardTitle>
                    <CardDescription>
                        Displayed on pricing cards in the billing page.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {features.length === 0 && !showInput && (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                        No features listed yet. Add some to show on pricing
                        cards.
                    </p>
                )}

                {features.length > 0 && (
                    <div className="space-y-1">
                        {features.map((feature, idx) => (
                            <div
                                key={`${feature}-${idx}`}
                                draggable={!saving}
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData(
                                        'text/plain',
                                        String(idx),
                                    );
                                    setDragIndex(idx);
                                    setDropIndex(idx);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (
                                        dragIndex !== null &&
                                        dragIndex !== idx
                                    ) {
                                        setDropIndex(idx);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (dragIndex !== null) {
                                        reorderFeatures(dragIndex, idx);
                                    }
                                    setDragIndex(null);
                                    setDropIndex(null);
                                }}
                                onDragEnd={() => {
                                    setDragIndex(null);
                                    setDropIndex(null);
                                }}
                                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 ${
                                    dragIndex === idx
                                        ? 'bg-muted/60 opacity-70'
                                        : ''
                                } ${
                                    dropIndex === idx && dragIndex !== idx
                                        ? 'ring-1 ring-primary/40'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                                    <CheckCircle className="size-4 shrink-0 text-primary" />
                                    <span>{feature}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    disabled={saving}
                                    onClick={() => removeFeature(idx)}
                                >
                                    <X className="size-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <Separator />

                {features.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                        Drag and drop features to reorder.
                    </p>
                )}

                {showInput ? (
                    <div className="flex items-center gap-2">
                        <Input
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            placeholder='e.g. "10 projects", "Priority support"'
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addFeature();
                                }
                                if (e.key === 'Escape') {
                                    setShowInput(false);
                                    setNewFeature('');
                                }
                            }}
                        />
                        <Button
                            size="sm"
                            onClick={addFeature}
                            disabled={saving || !newFeature.trim()}
                        >
                            {saving && <Spinner />}
                            Add
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setShowInput(false);
                                setNewFeature('');
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInput(true)}
                        className="gap-1.5"
                    >
                        <Plus className="size-4" />
                        Add Feature
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function ShowPricing({ product, prices }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pricing', href: index().url },
        { title: product.name, href: show.url(product.id) },
    ];

    const activePrices = prices.filter((p) => p.active);
    const inactivePrices = prices.filter((p) => !p.active);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={product.name} />
            <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <div className="flex items-start justify-between">
                    <Heading
                        title={product.name}
                        description={product.description ?? 'No description.'}
                    />
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={product.active ? 'default' : 'secondary'}
                        >
                            {product.active ? 'Active' : 'Archived'}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={edit.url(product.id)}>
                                <Pencil className="size-4" />
                                Edit Product
                            </Link>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base">Prices</CardTitle>
                            <CardDescription>
                                {activePrices.length} active,{' '}
                                {inactivePrices.length} inactive
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {activePrices.length === 0 &&
                        inactivePrices.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No prices yet. Add one below.
                            </p>
                        ) : (
                            <div className="divide-y">
                                {activePrices.map((price) => (
                                    <PriceRow key={price.id} price={price} />
                                ))}
                                {inactivePrices.map((price) => (
                                    <div key={price.id} className="opacity-50">
                                        <PriceRow price={price} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <Separator />

                        <AddPriceForm productId={product.id} />
                    </CardContent>
                </Card>

                <FeaturesCard
                    productId={product.id}
                    metadata={product.metadata}
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Product Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Stripe Product ID
                            </span>
                            <div className="flex items-center gap-1">
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                    {product.id}
                                </code>
                                <CopyButton text={product.id} />
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Created
                            </span>
                            <span>
                                {new Date(
                                    product.created * 1000,
                                ).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Free trial
                            </span>
                            <span>
                                {product.metadata?.trial_enabled === 'true' &&
                                product.metadata?.trial_days
                                    ? `${product.metadata.trial_days} days`
                                    : 'Disabled'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Trial without card
                            </span>
                            <span>
                                {product.metadata?.trial_enabled === 'true' &&
                                product.metadata?.trial_without_card === 'true'
                                    ? 'Enabled'
                                    : 'Disabled'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
