import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import {
  BarChart,  Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

type DailyTrend = {
  date:    string;
  income:  number;
  expense: number;
  net:     number;
};

interface IncomeExpenseChartProps {
  data: DailyTrend[];
}

type ChartView = "bar" | "line";

const formatCurrency = (val: number) => `₱${(val / 1000).toFixed(0)}k`;

const sharedTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,89%)", borderRadius: "8px", padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ margin: "0 0 6px", color: "hsl(220,10%,46%)", fontSize: 11 }}>{payload[0]?.payload?.date}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: "0 0 2px", fontWeight: 600, color: p.color }}>
          {p.dataKey === "income" ? "Income" : "Expense"}: ₱{(p.value as number).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const sharedLegend = (value: string) => (
  <span style={{ fontSize: 11, color: "hsl(220, 10%, 46%)" }}>
    {value === "income" ? "Income" : "Expense"}
  </span>
);

const sharedAxes = (
  <>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" vertical={false} />
    <XAxis dataKey="date"  tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} />
    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} tickLine={false} axisLine={false} width={50} />
  </>
);

export default function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const [view, setView] = useState<ChartView>("bar");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <CardTitle className="text-base font-semibold">Income vs Expenses</CardTitle>
            <p className="text-xs text-muted-foreground" style={{ marginTop: "0.15rem" }}>
              {view === "bar"
                ? "Daily breakdown for the selected period"
                : "Daily income and expense trend lines"}
            </p>
          </div>

          {/* Toggle pill */}
          <div style={{ display: "inline-flex", gap: "0.2rem", background: "hsl(var(--muted))", borderRadius: "0.5rem", padding: "0.2rem", flexShrink: 0 }}>
            {([
              { key: "bar",  label: "Bar"  },
              { key: "line", label: "Line" },
            ] as { key: ChartView; label: string }[]).map(({ key, label }) => {
              const active = view === key;
              return (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  style={{
                    padding:      "0.22rem 0.65rem",
                    borderRadius: "0.35rem",
                    fontSize:     "0.72rem",
                    fontWeight:   600,
                    border:       "none",
                    cursor:       "pointer",
                    transition:   "background 0.15s, color 0.15s",
                    background:   active ? "hsl(var(--background))" : "transparent",
                    color:        active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    boxShadow:    active ? "0 1px 3px hsl(220 13% 80% / 0.5)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {view === "bar" ? (
              <BarChart data={data} barGap={2} barCategoryGap="20%">
                {sharedAxes}
                <Tooltip content={sharedTooltip} />
                <Legend iconType="circle" formatter={sharedLegend} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="income"  name="income"  fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="expense" fill="hsl(0, 72%, 51%)"   radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={data}>
                {sharedAxes}
                <Tooltip content={sharedTooltip} />
                <Legend iconType="circle" formatter={sharedLegend} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="income"  stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="expense" stroke="hsl(0, 72%, 51%)"   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}