import { Card, CardContent } from "@/features/dashboard/components/ui/card";
import { cn } from "@/features/dashboard/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "income" | "expense" | "neutral";
}

// Hardcoded HSL values from index.css — Tailwind v4 doesn't resolve CSS var-based utilities
const variantStyles: Record<string, string> = {
  default:  "border-l-4 border-l-[hsl(199,89%,38%)]",   // --primary
  income:   "border-l-4 border-l-[hsl(160,60%,45%)]",   // --income
  expense:  "border-l-4 border-l-[hsl(0,72%,51%)]",     // --expense
  neutral:  "border-l-4 border-l-[hsl(220,10%,46%)]",   // --muted-foreground
};

const iconVariantStyles: Record<string, { wrapper: string; color: string }> = {
  default: { wrapper: "bg-[hsl(199,89%,38%,0.1)]",  color: "color: hsl(199,89%,38%)" },
  income:  { wrapper: "bg-[hsl(160,60%,45%,0.1)]",  color: "color: hsl(160,60%,45%)" },
  expense: { wrapper: "bg-[hsl(0,72%,51%,0.1)]",    color: "color: hsl(0,72%,51%)"   },
  neutral: { wrapper: "bg-[hsl(220,10%,46%,0.1)]",  color: "color: hsl(220,10%,46%)" },
};

export default function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: KpiCardProps) {
  const iconStyles = iconVariantStyles[variant];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", variantStyles[variant])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-card-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <p
                style={{
                  color: trend.value >= 0 ? "hsl(160,60%,45%)" : "hsl(0,72%,51%)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn("rounded-lg p-2.5", iconStyles.wrapper)}
            style={{
              backgroundColor:
                variant === "income"  ? "hsl(160 60% 45% / 0.1)" :
                variant === "expense" ? "hsl(0 72% 51% / 0.1)"   :
                variant === "neutral" ? "hsl(220 10% 46% / 0.1)" :
                                        "hsl(199 89% 38% / 0.1)",
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{
                color:
                  variant === "income"  ? "hsl(160,60%,45%)" :
                  variant === "expense" ? "hsl(0,72%,51%)"   :
                  variant === "neutral" ? "hsl(220,10%,46%)" :
                                          "hsl(199,89%,38%)",
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}