import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "primary" | "accent" | "blue" | "rose";
}

export function StatsCard({ title, value, icon: Icon, trend, color = "primary" }: StatsCardProps) {
  const colorStyles = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/20 text-accent-foreground",
    blue: "bg-blue-500/10 text-blue-600",
    rose: "bg-rose-500/10 text-rose-600",
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-3xl font-display font-bold mt-2 tracking-tight text-foreground">{value}</h3>
          {trend && <p className="text-xs mt-2 text-muted-foreground">{trend}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", colorStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
