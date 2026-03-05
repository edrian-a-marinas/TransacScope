import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Derived type — computed in DashboardOverview from daily transaction grouping
type DailyTrend = {
  date: string;
  income: number;
  expense: number;
  net: number;
};

interface IncomeExpenseChartProps {
  data: DailyTrend[];
}

const formatCurrency = (val: number) => `₱${(val / 1000).toFixed(0)}k`;

export default function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Income vs Expenses</CardTitle>
        <p className="text-xs text-muted-foreground">Daily breakdown for the selected period</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} width={50} />
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
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="income" name="Income" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}