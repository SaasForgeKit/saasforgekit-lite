import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    destroy as destroyConnectedProvider,
    redirect as redirectConnectedProvider,
} from '@/actions/App/Http/Controllers/Settings/ConnectedAccountsController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

type Provider = {
    key: string;
    label: string;
    configured: boolean;
    enabled: boolean;
    linked: boolean;
    linked_email: string | null;
};

type Props = {
    socialAuthEnabled: boolean;
    providers: Provider[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Connected Accounts',
        href: '/settings/connected-accounts',
    },
];

export default function ConnectedAccounts({
    socialAuthEnabled,
    providers,
}: Props) {
    const { flash } = usePage().props as {
        flash?: { success?: string | null; error?: string | null };
    };
    const [providerToUnlink, setProviderToUnlink] = useState<Provider | null>(
        null,
    );
    const [isUnlinking, setIsUnlinking] = useState(false);

    const confirmUnlink = () => {
        if (!providerToUnlink) {
            return;
        }

        setIsUnlinking(true);
        router.delete(destroyConnectedProvider(providerToUnlink.key).url, {
            preserveScroll: true,
            onFinish: () => {
                setIsUnlinking(false);
                setProviderToUnlink(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Connected Accounts" />

            <SettingsLayout>
                <Dialog
                    open={providerToUnlink !== null}
                    onOpenChange={(open) => {
                        if (!open && !isUnlinking) {
                            setProviderToUnlink(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogTitle>
                            Unlink {providerToUnlink?.label}?
                        </DialogTitle>
                        <DialogDescription>
                            You can link this provider again later. If this is
                            your only sign-in method, use Forgot Password to set
                            a password before your next login.
                        </DialogDescription>
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={isUnlinking}
                                >
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={isUnlinking}
                                onClick={confirmUnlink}
                            >
                                Confirm unlink
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Connected accounts"
                        description="Link providers to sign in without a password. Existing email/password accounts must be linked here before social sign-in is allowed."
                    />

                    {!socialAuthEnabled && (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            Social authentication is currently disabled by your
                            administrator.
                        </div>
                    )}

                    {flash?.success && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                            {flash.success}
                        </div>
                    )}

                    {flash?.error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                            {flash.error}
                        </div>
                    )}

                    <div className="space-y-3">
                        {providers.map((provider) => (
                            <div
                                key={provider.key}
                                className="flex items-center justify-between rounded-lg border p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {provider.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {provider.linked
                                            ? `Linked${provider.linked_email ? ` as ${provider.linked_email}` : ''}`
                                            : provider.enabled
                                              ? 'Not linked'
                                              : 'Unavailable'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!provider.linked ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={!provider.enabled}
                                            onClick={() =>
                                                window.location.assign(
                                                    redirectConnectedProvider(
                                                        provider.key,
                                                    ).url,
                                                )
                                            }
                                        >
                                            Link
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() =>
                                                setProviderToUnlink(provider)
                                            }
                                        >
                                            Unlink
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
