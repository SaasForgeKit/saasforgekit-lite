import { usePage } from '@inertiajs/react';
import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    const { name, logo } = usePage().props;

    return (
        <>
            {logo ? (
                <div className="flex aspect-square size-8 items-center justify-center">
                    <img
                        src={logo}
                        alt={name}
                        className="size-8 object-contain"
                    />
                </div>
            ) : (
                <div className="flex aspect-square size-8 items-center justify-center">
                    <AppLogoIcon className="size-8" />
                </div>
            )}
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
