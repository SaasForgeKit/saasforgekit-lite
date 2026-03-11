import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';
import { updateSocialAuth } from '@/actions/App/Http/Controllers/Admin/AppSettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AdminSettingsLayout from '@/layouts/admin-settings/layout';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type ProviderState = {
    key: string;
    label: string;
    configured: boolean;
    enabled: boolean;
    required_config: string[];
};

type Props = {
    settings: {
        social_auth_enabled: boolean;
        social_enabled_providers: string[];
    };
    providers: ProviderState[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Application Settings', href: '/admin/settings/social-auth' },
];

export default function SocialAuthSettings({ settings, providers }: Props) {
    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm({
            social_auth_enabled: settings.social_auth_enabled ?? false,
            social_enabled_providers: settings.social_enabled_providers ?? [],
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(updateSocialAuth.url(), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Social Auth Settings" />

            <AdminSettingsLayout>
                <form onSubmit={submit} className="space-y-6">
                    <Heading
                        variant="small"
                        title="Social Authentication"
                        description="Enable social login globally and per provider. Providers must be configured in environment variables before they can be enabled."
                    />

                    <div className="space-y-3">
                        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                            <input
                                type="checkbox"
                                checked={data.social_auth_enabled}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setData((prev) => ({
                                        ...prev,
                                        social_auth_enabled: enabled,
                                        social_enabled_providers: enabled
                                            ? prev.social_enabled_providers
                                            : [],
                                    }));
                                }}
                                className="mt-0.5 size-4 rounded border-input"
                            />
                            <span>
                                Enable social authentication across the
                                application.
                            </span>
                        </label>
                        <InputError message={errors.social_auth_enabled} />

                        <div className="space-y-3 rounded-lg border p-3 text-sm">
                            {providers.map((provider) => {
                                const disabled =
                                    !data.social_auth_enabled ||
                                    !provider.configured;
                                const checked =
                                    data.social_enabled_providers.includes(
                                        provider.key,
                                    );

                                return (
                                    <div
                                        key={provider.key}
                                        className="space-y-1"
                                    >
                                        <label className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                disabled={disabled}
                                                checked={checked}
                                                onChange={(e) => {
                                                    setData(
                                                        'social_enabled_providers',
                                                        e.target.checked
                                                            ? [
                                                                  ...data.social_enabled_providers,
                                                                  provider.key,
                                                              ]
                                                            : data.social_enabled_providers.filter(
                                                                  (key) =>
                                                                      key !==
                                                                      provider.key,
                                                              ),
                                                    );
                                                }}
                                                className="mt-0.5 size-4 rounded border-input"
                                            />
                                            <span
                                                className={cn(
                                                    disabled &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                Enable {provider.label}
                                            </span>
                                        </label>

                                        {!provider.configured && (
                                            <p className="pl-7 text-xs text-muted-foreground">
                                                Missing config:{' '}
                                                {provider.required_config.join(
                                                    ', ',
                                                )}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                            <InputError
                                message={errors.social_enabled_providers}
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
