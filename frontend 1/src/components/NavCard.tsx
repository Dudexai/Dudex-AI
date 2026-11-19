import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

interface NavCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  color?: string;
}

export const NavCard = ({ title, description, icon: Icon, to, color }: NavCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(to)}
      className="cursor-pointer p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated group"
    >
      <div className="flex items-start gap-4">
        <div 
          className="rounded-xl p-3 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          style={color ? { backgroundColor: `${color}20`, color } : undefined}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
};
