import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { allNavItems } from "@/config/navConfig";
import { cn } from "@/lib/utils";

export function AppSidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Sidebar
            collapsible="icon"
            className="hidden md:flex border-r border-border/50 bg-background/95 backdrop-blur-lg transition-all duration-300 ease-in-out"
        >
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {allNavItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                const Icon = item.icon;

                                return (
                                    <SidebarMenuItem key={item.path}>
                                        <SidebarMenuButton
                                            isActive={isActive}
                                            onClick={() => navigate(item.path)}
                                            className={cn(
                                                "transition-all duration-200",
                                                isActive
                                                    ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                            )}
                                        >
                                            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}
