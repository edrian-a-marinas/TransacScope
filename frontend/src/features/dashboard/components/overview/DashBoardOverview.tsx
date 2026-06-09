import { useDeferredValue, useMemo, useState, useEffect, useContext, lazy, Suspense, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import KpiCard from "./KpiCard";
import RecentTransactions from "./RecentTransactions";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { ReadTransaction } from "@/features/dashboard/schemas/transaction";
import type { CategoryRead } from "@/features/dashboard/schemas/category";
import ReadTransactions from "../modals/ReadTransactionModal";
import { useQuery } from "@tanstack/react-query";
const IncomeExpenseChart     = lazy(() => import("../charts/IncomeExpenseChart"));
const NetProfitChart         = lazy(() => import("../charts/NetProfitChart"));
const CategoryBreakdownChart = lazy(() => import("../charts/CategoryBreakdownChart"));
const CHART_COLORS = [
  "hsl(199, 89%, 38%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 90%, 56%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(45, 85%, 50%)",
  "hsl(200, 70%, 55%)",
];
const PRIMARY = "hsl(var(--primary))";
const INCOME  = "hsl(var(--income))";
type Period = "all" | string;
interface DashboardOverviewProps {
  userRole: number;
  userId:   number;
  chartsReadyRef: React.MutableRefObject<boolean>;
}
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: "0.5rem",
        border: "1px solid hsl(var(--page-border))",
        background: "linear-gradient(90deg, hsl(var(--page-surface-sub)) 25%, hsl(var(--page-surface)) 50%, hsl(var(--page-surface-sub)) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}
function formatPeriodLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
export default function DashboardOverview({ userRole, userId, chartsReadyRef }: DashboardOverviewProps) {
  const { user } = useContext(AuthContext);
  const userID   = user.id;
  const isAdmin  = userRole === 1;
  const roleLabel =
    userRole === 1 && userID === 1 ? "Super Admin"
    : userRole === 1               ? "Admin"
    :                                "Standard User";

  // no new network request. staleTime: Infinity ensures it never auto-refetches.
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<ReadTransaction[]>("api/transactions/").then(r =>
      r.data.filter(t => !t.deleted_at).map(t => ({ ...t, amount: parseFloat(String(t.amount)) }))
    ),
    staleTime: Infinity,
  });
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<CategoryRead[]>("api/categories/").then(r => r.data),
    staleTime: Infinity,
  });

  const loading = txLoading || catLoading;
  const [chartsReady, setChartsReady] = useState(chartsReadyRef.current);
  useEffect(() => {
    if (!loading && !chartsReadyRef.current) {
      chartsReadyRef.current = true;
      setChartsReady(true);
    } else if (!loading) {
      setChartsReady(true);
    }
  }, [loading]);
  const currentYM = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState<Period>(currentYM);
  const deferredPeriod = useDeferredValue(period);
  const [hoveredPeriod, setHoveredPeriod] = useState<Period | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "own">(isAdmin ? "all" : "own");
  const [openTransactionsModal,  setOpenTransactionsModal]  = useState(false);
  const [transactionTypeFilter,  setTransactionTypeFilter]  = useState<"all" | "Income" | "Expense">("all");
  const [transactionMonthFilter, setTransactionMonthFilter] = useState<string>("all");
  const [transactionViewMode,    setTransactionViewMode]    = useState<"all" | "own">("all");
  const openModal = (filter: "all" | "Income" | "Expense" = "all") => {
    setTransactionTypeFilter(filter);
    setTransactionMonthFilter(period !== "all" ? period : "all");
    setTransactionViewMode(viewMode);
    setOpenTransactionsModal(true);
  };
  const availablePeriods = useMemo(() => {
    let txs = [...transactions];
    if (!isAdmin || viewMode === "own") txs = txs.filter(t => t.user_id === userId);
    const monthSet = new Set<string>();
    txs.forEach(t => {
      const ym = t.transaction_date.slice(0, 7);
      if (ym) monthSet.add(ym);
    });
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [transactions, isAdmin, viewMode, userId]);
  const initializedRef = useRef(false);
  useEffect(() => {
    if (availablePeriods.length === 0) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    const hasCurrent = availablePeriods.includes(currentYM);
    if (hasCurrent) {
      setPeriod(currentYM);
    } else {
      const past = availablePeriods.filter(ym => ym <= currentYM);
      setPeriod(past.length > 0 ? past[0] : "all");
    }
  }, [availablePeriods]);
  const getCategoryName = (id: number | null) => {
    if (!id) return "Uncategorized";
    return categories.find((c) => c.id === id)?.name ?? "Unknown";
  };
  const filteredTransactions = useMemo(() => {
      if (loading) return [];
      let txs = [...transactions];
      if (!isAdmin || viewMode === "own") txs = txs.filter((t) => t.user_id === userId);
      if (deferredPeriod !== "all") txs = txs.filter(t => t.transaction_date.startsWith(deferredPeriod));
      return txs;
    }, [transactions, isAdmin, viewMode, userId, deferredPeriod, loading]);
  const summary = useMemo(() => {
    const incomeTx  = filteredTransactions.filter((t) => t.transaction_type === "Income");
    const expenseTx = filteredTransactions.filter((t) => t.transaction_type === "Expense");
    const totalIncome  = incomeTx.reduce((sum, t)  => sum + t.amount, 0);
    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome,
      totalExpense,
      netProfit:        totalIncome - totalExpense,
      transactionCount: filteredTransactions.length,
      incomeCount:      incomeTx.length,
      expenseCount:     expenseTx.length,
    };
  }, [filteredTransactions]);
  const dailyTrends = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTransactions.forEach((t) => {
      const date = t.transaction_date;
      if (!map.has(date)) map.set(date, { income: 0, expense: 0 });
      const entry = map.get(date)!;
      if (t.transaction_type === "Income") entry.income += t.amount;
      else entry.expense += t.amount;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date:    new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        income:  val.income,
        expense: val.expense,
        net:     val.income - val.expense,
      }));
  }, [filteredTransactions]);
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredTransactions.filter((t) => t.transaction_type === "Expense").forEach((t) => {
      const name = getCategoryName(t.category_id);
      const prev = map.get(name) || { amount: 0, count: 0 };
      map.set(name, { amount: prev.amount + t.amount, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([name, v], i) => ({
      name, amount: v.amount, count: v.count, fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredTransactions]);
  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filteredTransactions.filter((t) => t.transaction_type === "Income").forEach((t) => {
      const name = getCategoryName(t.category_id);
      const prev = map.get(name) || { amount: 0, count: 0 };
      map.set(name, { amount: prev.amount + t.amount, count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([name, v], i) => ({
      name, amount: v.amount, count: v.count, fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [filteredTransactions]);
  const deferredDailyTrends      = useDeferredValue(dailyTrends);
  const deferredExpenseBreakdown = useDeferredValue(expenseBreakdown);
  const deferredIncomeBreakdown  = useDeferredValue(incomeBreakdown);
  const profitMargin = summary.totalIncome > 0
    ? (summary.netProfit / summary.totalIncome) * 100
    : 0;
  if (loading) return (
    <p style={{ color: "hsl(var(--page-fg-muted))", padding: "2rem" }}>Loading dashboard data...</p>
  );
  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .ts-view-select {
          background:    hsl(var(--page-surface-sub));
          border:        1px solid hsl(var(--page-border));
          border-radius: 0.4rem;
          color:         hsl(var(--page-fg));
          font-size:     0.75rem;
          font-weight:   600;
          padding:       0.45rem 0.4rem;
          cursor:        pointer;
          outline:       none;
          transition:    border-color 0.15s, box-shadow 0.15s;
        }
        .ts-view-select:hover {
          border-color: hsl(var(--primary));
          box-shadow:   0 0 0 2px hsl(var(--primary) / 0.15);
        }
        .ts-view-select:focus {
          border-color: hsl(var(--primary));
          box-shadow:   0 0 0 3px hsl(var(--primary) / 0.2);
        }
        .ts-view-select option {
          background: hsl(var(--page-surface-sub));
          color:      hsl(var(--page-fg));
          font-weight: 500;
        }
        .ts-view-select option:checked {
          background: hsl(var(--primary));
          color:      #fff;
        }
        .period-scroll::-webkit-scrollbar {
          height: 2px;
        }
        .period-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .period-scroll::-webkit-scrollbar-thumb {
          background:    transparent;
          border-radius: 999px;
          transition:    background 0.2s;
        }
        .period-scroll.is-scrolling::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.45);
        }
      `}</style>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard Overview - {roleLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? viewMode === "all"
                  ? "All transactions across the business"
                  : "Your personal transaction summary"
                : "Your personal transaction summary"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isAdmin ? (
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as "all" | "own")}
                className="ts-view-select"
              >
                <option value="all">All Users</option>
                <option value="own">My Transactions</option>
              </select>
            ) : (
              <span style={{
                fontSize:     "0.75rem",
                fontWeight:   600,
                padding:      "0.4rem 0.65rem",
                borderRadius: "0.375rem",
                border:       "1px solid hsl(var(--page-border))",
                color:        "hsl(var(--page-fg-muted))",
                userSelect:   "none",
                whiteSpace:   "nowrap",
              }}>
                Viewing own
              </span>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "nowrap" }}>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.2rem", alignSelf: "flex-start" }}>
                <div
                  ref={(el) => {
                    if (!el) return;
                    const onWheel = (e: WheelEvent) => {
                      if (availablePeriods.length <= 5) return;
                      if (e.deltaY !== 0) {
                        e.preventDefault();
                        el.scrollBy({ left: e.deltaY * 2, behavior: "smooth" });
                      }
                    };
                    el.addEventListener("wheel", onWheel, { passive: false });

                    el.classList.add("period-scroll");

                    let scrollTimer: ReturnType<typeof setTimeout>;
                    const updateHints = () => {
                      const hintLeft  = el.parentElement?.querySelector("#scroll-hint-left")  as HTMLElement | null;
                      const hintRight = el.parentElement?.querySelector("#scroll-hint-right") as HTMLElement | null;
                      const atStart   = el.scrollLeft < 20;
                      const atEnd     = el.scrollLeft > el.scrollWidth - el.clientWidth - 20;
                      if (hintLeft)  hintLeft.style.opacity  = atEnd   ? "1" : "0";
                      if (hintRight) hintRight.style.opacity = atStart ? "1" : "0";

                      el.classList.add("is-scrolling");
                      clearTimeout(scrollTimer);
                      scrollTimer = setTimeout(() => el.classList.remove("is-scrolling"), 800);
                    };

                    el.addEventListener("scroll", updateHints);
                    setTimeout(updateHints, 100);

                    let isDown = false;
                    let startX = 0;
                    let scrollLeft = 0;
                    el.addEventListener("mousedown", (e) => {
                      isDown = true;
                      startX = e.pageX - el.offsetLeft;
                      scrollLeft = el.scrollLeft;
                    });
                    el.addEventListener("mouseleave", () => {
                      isDown = false;
                    });
                    el.addEventListener("mouseup", () => {
                      isDown = false;
                    });
                    el.addEventListener("mousemove", (e) => {
                      if (!isDown) return;
                      e.preventDefault();
                      const x = e.pageX - el.offsetLeft;
                      const walk = (x - startX) * 1.5;
                      el.scrollLeft = scrollLeft - walk;
                    });
                  }}
                  style={{
                    display:         "flex",
                    gap:             "0.25rem",
                    overflowX:       availablePeriods.length > 5 ? "auto" : "visible",
                    scrollbarWidth:  "none",
                    background:      "hsl(var(--page-surface))",
                    border:          "1px solid hsl(var(--page-border))",
                    borderRadius:    "0.5rem",
                    padding:         "0.25rem",
                    maxWidth:        availablePeriods.length > 5 ? "420px" : undefined,
                  }}
                >
                {availablePeriods.map((ym) => {
                  const isActive  = period === ym;
                  const isHovered = hoveredPeriod === ym;
                  return (
                    <button
                      key={ym}
                      onClick={() => setPeriod(ym)}
                      onMouseEnter={() => setHoveredPeriod(ym)}
                      onMouseLeave={() => setHoveredPeriod(null)}
                      style={{
                        flexShrink:      0,
                        fontSize:        "0.75rem",
                        fontWeight:      isActive ? 600 : 500,
                        padding:         "0.25rem 0.75rem",
                        borderRadius:    "0.375rem",
                        border:          "none",
                        cursor:          "pointer",
                        whiteSpace:      "nowrap",
                        transition:      "background-color 0.15s, color 0.15s",
                        backgroundColor: isActive  ? PRIMARY
                                       : isHovered ? "hsl(var(--income) / 0.12)"
                                       : "transparent",
                        color:           isActive  ? "hsl(0,0%,100%)"
                                       : isHovered ? INCOME
                                       : "hsl(var(--page-fg-muted))",
                        boxShadow:       isActive  ? "0 1px 4px hsl(var(--primary) / 0.25)" : "none",
                      }}
                    >
                      {formatPeriodLabel(ym)}
                    </button>
                  );
                })}
              </div>
                {availablePeriods.length > 5 && (
                  <div style={{ display: "flex", justifyContent: "space-between", paddingInline: "0.25rem" }}>
                    <div
                      id="scroll-hint-left"
                      style={{
                        fontSize:      "0.6rem",
                        fontWeight:    500,
                        color:         "hsl(var(--page-fg-muted))",
                        whiteSpace:    "nowrap",
                        pointerEvents: "none",
                        opacity:       0,
                        transition:    "opacity 0.2s",
                      }}
                    >
                      ← scroll up or drag to see recent months 
                    </div>
                    <div
                      id="scroll-hint-right"
                      style={{
                        fontSize:      "0.6rem",
                        fontWeight:    500,
                        color:         "hsl(var(--page-fg-muted))",
                        whiteSpace:    "nowrap",
                        pointerEvents: "none",
                        opacity:       0,
                        transition:    "opacity 0.2s",
                      }}
                    >
                      scroll down or drag to view older months →
                    </div>
                  </div>
                )}
              </div>

              {/* All Time — separate pill */}
              <button
                onClick={() => setPeriod("all")}
                onMouseEnter={() => setHoveredPeriod("all")}
                onMouseLeave={() => setHoveredPeriod(null)}
                style={{
                  flexShrink:      0,
                  fontSize:        "0.75rem",
                  fontWeight:      period === "all" ? 600 : 500,
                  padding:         "0.51rem 0.75rem",
                  borderRadius:    "0.375rem",
                  border:          period === "all" ? "none" : "1px solid hsl(var(--page-border))",
                  cursor:          "pointer",
                  whiteSpace:      "nowrap",
                  transition:      "background-color 0.15s, color 0.15s",
                  backgroundColor: period === "all"       ? PRIMARY
                                 : hoveredPeriod === "all" ? "hsl(var(--income) / 0.12)"
                                 : "hsl(var(--page-surface))",
                  color:           period === "all"       ? "hsl(0,0%,100%)"
                                 : hoveredPeriod === "all" ? INCOME
                                 : "hsl(var(--page-fg))",
                  boxShadow:       period === "all" ? "0 1px 4px hsl(var(--primary) / 0.25)" : "none",
                }}
              >
                All time
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Income"
            value={`₱${summary.totalIncome.toLocaleString()}`}
            subtitle={`${summary.incomeCount} transactions`}
            icon={ArrowDownLeft}
            variant="income"
            onClick={() => openModal("Income")}
          />
          <KpiCard
            title="Total Expenses"
            value={`₱${summary.totalExpense.toLocaleString()}`}
            subtitle={`${summary.expenseCount} transactions`}
            icon={ArrowUpRight}
            variant="expense"
            onClick={() => openModal("Expense")}
          />
          <KpiCard
            title="Net Profit"
            value={`${summary.netProfit >= 0 ? "" : "-"}₱${Math.abs(summary.netProfit).toLocaleString()}`}
            subtitle={`${profitMargin.toFixed(1)}% margin`}
            icon={summary.netProfit >= 0 ? TrendingUp : TrendingDown}
            variant={summary.netProfit >= 0 ? "income" : "expense"}
            onClick={() => openModal("all")}
          />
          <KpiCard
            title="Transactions"
            value={summary.transactionCount.toString()}
            subtitle="Active records"
            icon={Activity}
            variant="default"
            onClick={() => openModal("all")}
          />
        </div>
        {chartsReady ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Suspense fallback={<ChartSkeleton height={340} />}>
                <IncomeExpenseChart data={deferredDailyTrends} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton height={340} />}>
                <NetProfitChart data={deferredDailyTrends} />
              </Suspense>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <CategoryBreakdownChart title="Expense Breakdown" subtitle="By category" data={deferredExpenseBreakdown} />
              </Suspense>
              <Suspense fallback={<ChartSkeleton height={320} />}>
                <CategoryBreakdownChart title="Income Breakdown"  subtitle="By category" data={deferredIncomeBreakdown} />
              </Suspense>
              <RecentTransactions
                transactions={filteredTransactions}
                getCategoryName={getCategoryName}
                openViewTransactions={() => openModal("all")}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartSkeleton height={340} />
              <ChartSkeleton height={340} />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartSkeleton height={320} />
              <ChartSkeleton height={320} />
              <ChartSkeleton height={320} />
            </div>
          </>
        )}
        {openTransactionsModal && (
          <ReadTransactions
            onClose={() => setOpenTransactionsModal(false)}
            initialTypeFilter={transactionTypeFilter}
            initialMonthFilter={transactionMonthFilter}
            initialViewMode={transactionViewMode}
          />
        )}
      </div>
    </>
  );
}