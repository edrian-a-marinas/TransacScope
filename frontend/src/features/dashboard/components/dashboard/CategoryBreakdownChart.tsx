import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Derived type — computed in DashboardOverview, not from backend schemas
type CategoryBreakdown = {
  name: string;
  amount: number;
  count: number;
  fill: string;
};

interface CategoryBreakdownChartProps {
  title: string;
  subtitle: string;
  data: CategoryBreakdown[];
}

export default function CategoryBreakdownChart({ title, subtitle, data }: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: "280px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="amount"
                nameKey="name"
                strokeWidth={2}
                stroke="hsl(0, 0%, 100%)"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`₱${value.toLocaleString()}`, undefined]}
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 89%)",
                  borderRadius: "8px",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => (
                  <span style={{ color: "var(--card-foreground)" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}