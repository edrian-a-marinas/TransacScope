import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";


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
                formatter={(value: number) => [`₱${value.toLocaleString()}`, "Net Profit"]}
                contentStyle={{
                  background: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 89%)",
                  borderRadius: "8px",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
