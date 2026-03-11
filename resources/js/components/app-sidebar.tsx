import { Link, usePage } from '@inertiajs/react';
import {
    CreditCard,
    LayoutGrid,
    ListTodo,
    PanelLeft,
    Settings,
    Users,
} from 'lucide-react';
import { edit as adminSettingsGeneral } from '@/actions/App/Http/Controllers/Admin/AppSettingsController';
import AdminDashboard from '@/actions/App/Http/Controllers/Admin/DashboardController';
import { index as pricingIndex } from '@/actions/App/Http/Controllers/Admin/StripePricingController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/Admin/UserController';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: AdminDashboard.url(),
        icon: PanelLeft,
        prefetch: false,
    },
    {
        title: 'Users',
        href: usersIndex(),
        icon: Users,
        prefetch: false,
    },
    {
        title: 'Pricing',
        href: pricingIndex(),
        icon: CreditCard,
        prefetch: false,
    },
    {
        title: 'Settings',
        href: adminSettingsGeneral(),
        icon: Settings,
        prefetch: false,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{
        auth: { is_admin: boolean };
    }>().props;
    const dashboardHref = '/dashboard';

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardHref,
            icon: LayoutGrid,
        },
        {
            title: 'Tasks',
            href: '/tasks',
            icon: ListTodo,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {auth.is_admin && (
                    <NavMain items={adminNavItems} label="Admin" />
                )}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
