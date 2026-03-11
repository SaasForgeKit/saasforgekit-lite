import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { updateEmails } from '@/actions/App/Http/Controllers/Admin/AppSettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AdminSettingsLayout from '@/layouts/admin-settings/layout';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type Props = {
    settings: {
        emails_enabled: boolean;
        emails_subscription_activated_enabled: boolean;
        emails_trial_started_enabled: boolean;
        emails_payment_failed_enabled: boolean;
        emails_subscription_canceled_enabled: boolean;
        emails_invoice_paid_enabled: boolean;
        emails_welcome_enabled: boolean;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Application Settings', href: '/admin/settings/emails' },
];

export default function EmailSettings({ settings }: Props) {
    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm({
            emails_enabled: settings.emails_enabled ?? true,
            emails_subscription_activated_enabled:
                settings.emails_subscription_activated_enabled ?? true,
            emails_trial_started_enabled:
                settings.emails_trial_started_enabled ?? true,
            emails_payment_failed_enabled:
                settings.emails_payment_failed_enabled ?? true,
            emails_subscription_canceled_enabled:
                settings.emails_subscription_canceled_enabled ?? true,
            emails_invoice_paid_enabled:
                settings.emails_invoice_paid_enabled ?? true,
            emails_welcome_enabled: settings.emails_welcome_enabled ?? true,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(updateEmails.url(), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email Settings" />

            <AdminSettingsLayout>
                <form onSubmit={submit} className="space-y-6">
                    <Heading
                        variant="small"
                        title="Transactional Emails"
                        description="Control billing-related emails sent to account owners."
                    />

                    <div className="space-y-3">
                        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={data.emails_enabled}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setData((prev) => ({
                                        ...prev,
                                        emails_enabled: enabled,
                                        emails_subscription_activated_enabled:
                                            enabled
                                                ? prev.emails_subscription_activated_enabled
                                                : false,
                                        emails_trial_started_enabled: enabled
                                            ? prev.emails_trial_started_enabled
                                            : false,
                                        emails_payment_failed_enabled: enabled
                                            ? prev.emails_payment_failed_enabled
                                            : false,
                                        emails_subscription_canceled_enabled:
                                            enabled
                                                ? prev.emails_subscription_canceled_enabled
                                                : false,
                                        emails_invoice_paid_enabled: enabled
                                            ? prev.emails_invoice_paid_enabled
                                            : false,
                                        emails_welcome_enabled: enabled
                                            ? prev.emails_welcome_enabled
                                            : false,
                                    }));
                                }}
                                className="mt-0.5 size-4 rounded border-input"
                            />
                            <span>
                                Enable all transactional billing emails.
                            </span>
                        </label>
                        <InputError message={errors.emails_enabled} />

                        <div className="space-y-3 rounded-lg border p-3 text-sm">
                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.emails_welcome_enabled}
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_welcome_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send welcome email when a user registers.
                                </span>
                            </label>
                            <InputError
                                message={errors.emails_welcome_enabled}
                            />

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={
                                        data.emails_subscription_activated_enabled
                                    }
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_subscription_activated_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send email when a paid subscription is
                                    activated.
                                </span>
                            </label>
                            <InputError
                                message={
                                    errors.emails_subscription_activated_enabled
                                }
                            />

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.emails_trial_started_enabled}
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_trial_started_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send email when a trial starts.
                                </span>
                            </label>
                            <InputError
                                message={errors.emails_trial_started_enabled}
                            />

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.emails_payment_failed_enabled}
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_payment_failed_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send email when invoice payment fails.
                                </span>
                            </label>
                            <InputError
                                message={errors.emails_payment_failed_enabled}
                            />

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={
                                        data.emails_subscription_canceled_enabled
                                    }
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_subscription_canceled_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send email when a subscription is canceled.
                                </span>
                            </label>
                            <InputError
                                message={
                                    errors.emails_subscription_canceled_enabled
                                }
                            />

                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.emails_invoice_paid_enabled}
                                    disabled={!data.emails_enabled}
                                    onChange={(e) =>
                                        setData(
                                            'emails_invoice_paid_enabled',
                                            e.target.checked,
                                        )
                                    }
                                    className="mt-0.5 size-4 rounded border-input"
                                />
                                <span
                                    className={cn(
                                        !data.emails_enabled &&
                                            'text-muted-foreground',
                                    )}
                                >
                                    Send email when an invoice is paid.
                                </span>
                            </label>
                            <InputError
                                message={errors.emails_invoice_paid_enabled}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button disabled={processing}>Save</Button>

                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="text-sm text-neutral-600">Saved</p>
                        </Transition>
                    </div>
                </form>
            </AdminSettingsLayout>
        </AppLayout>
    );
}
