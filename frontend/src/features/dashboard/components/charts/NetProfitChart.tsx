import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Derived type — computed in DashboardOverview from daily transaction grouping
type DailyTrend = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

interface NetProfitChartProps {
  data: DailyTrend[];
}

const formatCurrency = (val: number) => {
  if (val === 0) return "₱0";
  const prefix = val < 0 ? "-₱" : "₱";
  return `${prefix}${(Math.abs(val) / 1000).toFixed(0)}k`;
};

export default function NetProfitChart({ data }: NetProfitChartProps) {
  // Accumulate net profit over time
  let cumulative = 0;
  const cumulativeData = data.map((d) => {
    cumulative += d.net;
    return { ...d, cumulative };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Cumulative Net Profit</CardTitle>
        <p className="text-xs text-muted-foreground">Running total — green above zero, red below</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} width={55} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0].value as number;
                  const isPositive = val >= 0;
                  const color = isPositive ? "hsl(160,60%,38%)" : "hsl(0,72%,51%)";
                  const sign  = isPositive ? "+" : "-";
                  return (
                    <div style={{
                      background:   "hsl(0,0%,100%)",
                      border:       "1px solid hsl(220,13%,89%)",
                      borderRadius: "8px",
                      padding:      "8px 12px",
                      fontSize:     12,
                      boxShadow:    "0 4px 12px rgba(0,0,0,0.08)",
                    }}>
                      <p style={{ margin: "0 0 4px", color: "hsl(220,10%,46%)", fontSize: 11 }}>
                        {payload[0].payload.date}
                      </p>
                      <p style={{ margin: 0, fontWeight: 600, color }}>
                        Net Profit: {sign}₱{Math.abs(val).toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="hsl(220, 10%, 46%)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(160, 60%, 45%)"
                strokeWidth={2}
                fill="url(#profitGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}