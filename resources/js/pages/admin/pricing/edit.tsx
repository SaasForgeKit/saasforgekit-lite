import { Head, useForm } from '@inertiajs/react';
import {
    index,
    show,
    update,
} from '@/actions/App/Http/Controllers/Admin/StripePricingController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Product = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    popular: boolean;
    cta: string;
    trial_enabled: boolean;
    trial_days: number | null;
    trial_without_card: boolean;
};

type Props = {
    product: Product;
};

export default function EditPricing({ product }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Pricing', href: index().url },
        { title: product.name, href: show.url(product.id) },
        { title: 'Edit', href: '#' },
    ];

    const { data, setData, put, processing, errors } = useForm({
        name: product.name,
        description: product.description ?? '',
        active: product.active,
        popular: product.popular,
        cta: product.cta,
        trial_enabled: product.trial_enabled,
        trial_days: product.trial_days ?? 14,
        trial_without_card: product.trial_without_card ?? false,
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(update.url(product.id));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Product: ${product.name}`} />
            <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
                <Heading
                    title={`Edit Product: ${product.name}`}
                    description="Update this Stripe product's details."
                />

                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg border bg-card p-6"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            autoFocus
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">
                            Description{' '}
                            <span className="text-muted-foreground">
                                (optional)
                            </span>
                        </Label>
                        <Input
                            id="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cta">
                            Button text{' '}
                            <span className="text-muted-foreground">
                                (optional, defaults to &ldquo;Get
                                Started&rdquo;)
                            </span>
                        </Label>
                        <Input
                            id="cta"
                            value={data.cta}
                            onChange={(e) => setData('cta', e.target.value)}
                            placeholder="Get Started"
                            maxLength={50}
                        />
                        <InputError message={errors.cta} />
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.active}
                                    onChange={(e) =>
                                        setData('active', e.target.checked)
                                    }
                                    className="size-4 rounded border-input"
                                />
                                Active
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.popular}
                                    onChange={(e) =>
                                        setData('popular', e.target.checked)
                                    }
                                    className="size-4 rounded border-input"
                                />
                                Mark as popular
                                <span className="text-muted-foreground">
                                    (highlights this plan on the billing page)
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-lg border p-4">
                        <div>
                            <h3 className="text-sm font-medium">
                                Free Trial Settings
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.trial_enabled}
                                    onChange={(e) => {
                                        const enabled = e.target.checked;
                                        setData((prev) => ({
                                            ...prev,
                                            trial_enabled: enabled,
                                            trial_without_card: enabled
                                                ? prev.trial_without_card
                                                : false,
                                        }));
                                    }}
                                    className="size-4 rounded border-input"
                                />
                                Enable free trial for this plan
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.trial_without_card}
                                    disabled={!data.trial_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'trial_without_card',
                                            e.target.checked,
                                        )
                                    }
                                    className="size-4 rounded border-input"
                                />
                                Enable free trial without credit card
                            </label>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="trial_days">
                                Trial days
                                <span className="text-muted-foreground">
                                    {' '}
                                    (plan-level)
                                </span>
                            </Label>
                            <Input
                                id="trial_days"
                                type="number"
                                min={1}
                                max={365}
                                value={data.trial_days}
                                disabled={!data.trial_enabled}
                                onChange={(e) =>
                                    setData(
                                        'trial_days',
                                        Number(e.target.value || 0),
                                    )
                                }
                            />
                            <InputError message={errors.trial_days} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Save Changes
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <a href={show.url(product.id)}>Cancel</a>
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
