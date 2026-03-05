import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ReadTransaction } from "@/features/dashboard/schemas/transaction";

// Hardcoded HSL from index.css — Tailwind v4 doesn't resolve CSS var-based utilities
const INCOME_COLOR  = "hsl(160,60%,45%)";
const EXPENSE_COLOR = "hsl(0,72%,51%)";

interface RecentTransactionsProps {
  transactions: ReadTransaction[];
  getCategoryName: (id: number | null) => string;
}

export default function RecentTransactions({ transactions, getCategoryName }: RecentTransactionsProps) {
  const recent = transactions
    .filter((t) => !t.deleted_at)
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
        <p className="text-xs text-muted-foreground">Latest activity across all users</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-1">
          {recent.map((tx) => {
            const isIncome = tx.transaction_type === "Income";
            const color = isIncome ? INCOME_COLOR : EXPENSE_COLOR;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                style={{ cursor: "default" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(220,14%,95%)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div className="flex items-center gap-3">
                  {/* Icon bubble */}
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isIncome
                        ? "hsl(160 60% 45% / 0.1)"
                        : "hsl(0 72% 51% / 0.1)",
                      color,
                    }}
                  >
                    {isIncome
                      ? <ArrowDownLeft className="h-4 w-4" />
                      : <ArrowUpRight className="h-4 w-4" />
                    }
                  </div>

                  {/* Description + category */}
                  <div>
                    <p className="text-sm font-medium text-card-foreground leading-tight">
                      {tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryName(tx.category_id)} ·{" "}
                      {new Date(tx.transaction_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <p className="text-sm font-semibold tabular-nums" style={{ color }}>
                  {isIncome ? "+" : "-"}₱{tx.amount.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}