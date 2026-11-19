import { useState } from "react";
import { useStartup } from "@/hooks/useStartup";
import { Button } from "@/components/ui/button";
import { ChevronDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export const StartupSelector = () => {
  const navigate = useNavigate();
  const { startups, activeStartup, setActiveStartupId, refreshStartups } = useStartup();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectStartup = async (startupId: string) => {
    setActiveStartupId(startupId);
    // Refresh to get updated data
    await refreshStartups();
    setIsOpen(false);
  };

  if (!activeStartup || startups.length === 0) {
    return (
      <Button variant="outline" disabled>
        <Building2 className="h-4 w-4 mr-2" />
        No Startup
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="truncate max-w-[150px]">{activeStartup.name}</span>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Switch Startup
        </div>

        {startups.map((startup) => (
          <DropdownMenuItem
            key={startup.id}
            onClick={() => handleSelectStartup(startup.id)}
            className={`flex flex-col items-start ${startup.id === activeStartup.id ? "border-l-2 border-primary bg-primary/5" : ""}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium truncate max-w-[140px]">{startup.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">
                {startup.userRole || "Founder"}
              </span>
            </div>
            {startup.description && (
              <div className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                {startup.description}
              </div>
            )}
          </DropdownMenuItem>
        ))}

        <div className="border-t mt-2 pt-2">
          <DropdownMenuItem onClick={() => navigate("/home?manage=true")}>
            Manage Sessions
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};