import { Card, CardContent, CardHeader, CardTitle } from "@/features/dashboard/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Info } from "lucide-react";
import { useState } from "react";
import type { ReadTransaction } from "@/features/dashboard/schemas/transaction";
import TransactionDetailModal from "../modals/SpecificTransactionModal";

const INCOME_COLOR  = "hsl(160,60%,45%)";
const EXPENSE_COLOR = "hsl(0,72%,51%)";

interface RecentTransactionsProps {
  transactions:         ReadTransaction[];
  getCategoryName:      (id: number | null) => string;
  openViewTransactions: () => void;
}

function formatTxDate(dateStr: string): string {
  const date     = new Date(dateStr);
  const now      = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TitleTooltip() {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <Info style={{ width: "13px", height: "13px", marginLeft: "5px", color: "hsl(220,10%,55%)", cursor: "help", flexShrink: 0 }} />
      {visible && (
        <span style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", backgroundColor: "hsl(220,20%,14%)", border: "1px solid hsl(220,20%,22%)", borderRadius: "7px", padding: "8px 11px", whiteSpace: "nowrap", fontSize: "11.5px", color: "hsl(220,14%,85%)", lineHeight: "1.6", zIndex: 50, boxShadow: "0 4px 16px hsla(220,28%,4%,0.5)", pointerEvents: "none" }}>
          <span style={{ color: "hsl(199,89%,48%)", fontWeight: 600 }}>Dates are based on Transaction Date</span><br />
          <span style={{ color: "hsl(220,10%,55%)", fontSize: "11px" }}>Not when the record was created in the system.</span>
          <span style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid hsl(220,20%,22%)" }} />
        </span>
      )}
    </span>
  );
}

export default function RecentTransactions({ transactions, getCategoryName, openViewTransactions }: RecentTransactionsProps) {
  const now = new Date();
  const [selected, setSelected] = useState<ReadTransaction | null>(null);

  const recent = transactions
    .filter((t) => !t.deleted_at)
    .filter((t) => new Date(t.transaction_date) <= now)
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
    .slice(0, 8);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold" style={{ display: "flex", alignItems: "center" }}>
            Recent Transactions
            <TitleTooltip />
          </CardTitle>
          <p className="text-xs text-muted-foreground">Latest activity across all users</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-1">
            {recent.map((tx) => {
              const isIncome    = tx.transaction_type === "Income";
              const color       = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
              const description = tx.description?.trim() || null;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(tx)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--muted))")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: isIncome ? "hsl(160 60% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)", color }}>
                      {isIncome ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground leading-tight">
                        {getCategoryName(tx.category_id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {description ? `${description} · ` : ""}
                        {formatTxDate(tx.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold tabular-nums" style={{ color }}>
                    {isIncome ? "+" : "-"}₱{tx.amount.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 px-3 pb-2">
            <button
              onClick={openViewTransactions}
              className="relative z-10 w-full text-xs font-medium py-2 rounded-md border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              View All Transactions
            </button>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <TransactionDetailModal
          transaction={selected}
          getCategoryName={getCategoryName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}