import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  User,
  Users2
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { allNavItems, topBarNavItems } from "@/config/navConfig";
import { cn } from "@/lib/utils";

interface TopBarProps {
  backTo?: string;
  showSearch?: boolean;
}

export const TopBar = ({ backTo, showSearch = true }: TopBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();



  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur-lg">
      <div className="mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Left Side: Logo & Back Button */}
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-background">
                  <SheetHeader className="p-6 border-b border-border/50">
                      <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-10 w-auto object-contain mix-blend-multiply" />
                  </SheetHeader>
                  <div className="flex flex-col py-4">
                    {[...allNavItems, ...topBarNavItems].map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary border-r-2 border-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden md:flex items-center gap-2 mr-2">
              <img src="https://res.cloudinary.com/dtbsyy5zm/image/upload/v1773155396/website_logo_lctco7.jpg" alt="DudexAI Logo" className="h-10 lg:h-12 w-auto object-contain mix-blend-multiply" />
              <div className="ml-4 h-6 w-[1px] bg-border/50" />
            </div>
          </div>

          {/* Right Side: Navigation & Profile */}
          <div className="flex items-center gap-1 sm:gap-4 ml-auto">
            {/* Desktop Navigation Icons */}
            <div className="hidden md:flex items-center gap-1">
              {topBarNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "h-9 w-9 rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};
