import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { Database, ImageUp } from 'lucide-react';
import { type FormEventHandler, useRef } from 'react';
import { update } from '@/actions/App/Http/Controllers/Admin/AppSettingsController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminSettingsLayout from '@/layouts/admin-settings/layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Props = {
    settings: {
        app_name: string;
        logo: string | null;
        favicon: string | null;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Application Settings', href: '/admin/settings/general' },
];

export default function GeneralSettings({ settings }: Props) {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm<{
            app_name: string;
            logo: File | null;
            favicon: File | null;
            remove_logo: boolean;
            remove_favicon: boolean;
        }>({
            app_name: settings.app_name ?? '',
            logo: null,
            favicon: null,
            remove_logo: false,
            remove_favicon: false,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(update.url(), {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const logoSrc = data.logo
        ? URL.createObjectURL(data.logo)
        : !data.remove_logo
          ? settings.logo
          : null;

    const faviconSrc = data.favicon
        ? URL.createObjectURL(data.favicon)
        : !data.remove_favicon
          ? settings.favicon
          : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Settings" />

            <h1 className="sr-only">Application Settings</h1>

            <AdminSettingsLayout>
                <form onSubmit={submit} className="space-y-6">
                    <Heading
                        variant="small"
                        title="General"
                        description="Update your application name, logo, and favicon"
                    />

                    <div className="grid gap-2">
                        <Label htmlFor="app_name">Application Name</Label>

                        <Input
                            id="app_name"
                            className="mt-1 block w-full"
                            value={data.app_name}
                            onChange={(e) =>
                                setData('app_name', e.target.value)
                            }
                            required
                            placeholder="My Application"
                        />

                        <InputError
                            className="mt-2"
                            message={errors.app_name}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Logo</Label>

                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
                                onClick={() => logoInputRef.current?.click()}
                            >
                                {logoSrc ? (
                                    <img
                                        src={logoSrc}
                                        alt="Logo"
                                        className="h-full w-full object-contain p-2"
                                    />
                                ) : (
                                    <ImageUp className="size-6 text-muted-foreground/50" />
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5 pt-1">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            logoInputRef.current?.click()
                                        }
                                    >
                                        {logoSrc ? 'Change' : 'Upload'}
                                    </Button>

                                    {logoSrc && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                                setData((prev) => ({
                                                    ...prev,
                                                    logo: null,
                                                    remove_logo: true,
                                                }));
                                                if (logoInputRef.current)
                                                    logoInputRef.current.value =
                                                        '';
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    PNG, JPG, SVG, or WebP. Max 2MB.
                                </p>
                            </div>
                        </div>

                        <input
                            ref={logoInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file)
                                    setData((prev) => ({
                                        ...prev,
                                        logo: file,
                                        remove_logo: false,
                                    }));
                            }}
                        />

                        <InputError message={errors.logo} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Favicon</Label>

                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
                                onClick={() => faviconInputRef.current?.click()}
                            >
                                {faviconSrc ? (
                                    <img
                                        src={faviconSrc}
                                        alt="Favicon"
                                        className="h-full w-full object-contain p-2"
                                    />
                                ) : (
                                    <ImageUp className="size-5 text-muted-foreground/50" />
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5 pt-1">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            faviconInputRef.current?.click()
                                        }
                                    >
                                        {faviconSrc ? 'Change' : 'Upload'}
                                    </Button>

                                    {faviconSrc && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => {
                                                setData((prev) => ({
                                                    ...prev,
                                                    favicon: null,
                                                    remove_favicon: true,
                                                }));
                                                if (faviconInputRef.current)
                                                    faviconInputRef.current.value =
                                                        '';
                                            }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    PNG, ICO, or SVG. Max 512KB.
                                </p>
                            </div>
                        </div>

                        <input
                            ref={faviconInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png,image/x-icon,image/svg+xml"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file)
                                    setData((prev) => ({
                                        ...prev,
                                        favicon: file,
                                        remove_favicon: false,
                                    }));
                            }}
                        />

                        <InputError message={errors.favicon} />
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
