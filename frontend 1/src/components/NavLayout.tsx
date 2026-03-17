import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function NavLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider defaultOpen={false}>
            <div className="flex min-h-screen w-full bg-background">
                {/* Desktop Sidebar */}
                <AppSidebar />

                {/* Content Area */}
                <SidebarInset className="flex-1 flex flex-col relative min-h-screen">
                    <main className="flex-1">
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
