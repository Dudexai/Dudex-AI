import {
    Home,
    ListTodo,
    Video,
    Calendar,
    Shield,
    Users2,
    User,
    MoreHorizontal,
    Settings,
    Users,
} from "lucide-react";

export interface NavItemConfig {
    icon: React.ElementType;
    label: string;
    path: string;
}

/** Primary items shown directly in the mobile bottom bar */
export const primaryNavItems: NavItemConfig[] = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: ListTodo, label: "Plans", path: "/plans" },
    { icon: Video, label: "Meetings", path: "/meetings" },
];

/** Overflow items shown under the "More" menu */
export const moreNavItems: NavItemConfig[] = [
    { icon: Users, label: "Team", path: "/team" },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Shield, label: "Vault", path: "/vault" },
    { icon: Users2, label: "Community", path: "/community" },
    { icon: Settings, label: "Settings", path: "/settings" },
];

/** Items shown on the right side of the TopBar */
export const topBarNavItems: NavItemConfig[] = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: User, label: "Profile", path: "/profile" },
];

/** All navigation items combined (for desktop sidebar) */
export const allNavItems: NavItemConfig[] = [
    ...primaryNavItems,
    ...moreNavItems,
];

/** Icon used for the "More" trigger in the bottom bar */
export const MoreIcon = MoreHorizontal;
