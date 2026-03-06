import { useEffect, useState, useContext, useMemo } from "react";
import { X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";

import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import type { Category, ReadTransaction } from "@/features/dashboard/schemas/transaction";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";

// ── Same tokens as CreateTransactionModal ────────────────────────────────────
const C = {
  primary:   "hsl(199,89%,38%)",
  income:    "hsl(160,60%,45%)",
  expense:   "hsl(0,72%,51%)",
  surface:   "hsl(220,20%,12%)",
  surfaceEl: "hsl(220,18%,16%)",
  surfaceHov:"hsl(220,16%,20%)",
  border:    "hsl(220,16%,22%)",
  fg:        "hsl(220,14%,90%)",
  fgMuted:   "hsl(220,10%,55%)",
  overlay:   "rgba(0,0,0,0.55)",
};

// ── Types ────────────────────────────────────────────────────────────────────
type SortField = "id" | "user_id" | "category" | "amount" | "transaction_date" | "created_at";
type SortDir   = "asc" | "desc";
type TypeFilter = "all" | "Income" | "Expense";

// ── Small dropdown for Type filter ──────────────────────────────────────────
interface DropdownProps {
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
}
function TypeDropdown({ value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const options: { value: TypeFilter; label: string }[] = [
    { value: "all",     label: "All Types" },
    { value: "Income",  label: "Income Only" },
    { value: "Expense", label: "Expense Only" },
  ];
  const current = options.find(o => o.value === value)!;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "0.3rem",
          background:     C.surfaceEl,
          border:         `1px solid ${C.border}`,
          borderRadius:   "0.4rem",
          color:          value === "Income"  ? C.income
                        : value === "Expense" ? C.expense
                        : C.fgMuted,
          fontSize:       "0.72rem",
          fontWeight:     600,
          padding:        "0.25rem 0.5rem",
          cursor:         "pointer",
          whiteSpace:     "nowrap",
        }}
      >
        {current.label}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      {open && (
        <div
          style={{
            position:        "absolute",
            top:             "calc(100% + 4px)",
            left:            0,
            background:      C.surfaceEl,
            border:          `1px solid ${C.border}`,
            borderRadius:    "0.4rem",
            zIndex:          200,
            minWidth:        "120px",
            boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
            overflow:        "hidden",
          }}
        >
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                padding:    "0.4rem 0.75rem",
                background: o.value === value ? C.surfaceHov : "transparent",
                border:     "none",
                color:      o.value === "Income"  ? C.income
                          : o.value === "Expense" ? C.expense
                          : C.fg,
                fontSize:   "0.75rem",
                cursor:     "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sort icon helper ─────────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const size = { width: "0.7rem", height: "0.7rem" };
  if (active !== field) return <ArrowUpDown style={{ ...size, opacity: 0.35 }} />;
  return dir === "asc"
    ? <ArrowUp   style={{ ...size, color: C.primary }} />
    : <ArrowDown style={{ ...size, color: C.primary }} />;
}

// ── Shell ────────────────────────────────────────────────────────────────────
interface ShellProps {
  children:        React.ReactNode;
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}
function Shell({ children, onBackdropDown, onBackdropUp }: ShellProps) {
  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          50,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderRadius: "1rem",
          width:        "100%",
          maxWidth:     "1100px",
          display:      "flex",
          flexDirection:"column",
          maxHeight:    "90vh",
          boxShadow:    "0 24px 48px rgba(0,0,0,0.5)",
          overflow:     "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Month filter dropdown ────────────────────────────────────────────────────
interface MonthDropdownProps {
  value:    string; // "all" or "YYYY-MM"
  options:  { key: string; label: string }[];
  onChange: (v: string) => void;
}
function MonthDropdown({ value, options, onChange }: MonthDropdownProps) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.key === value) ?? options[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "0.3rem",
          background:   C.surfaceEl,
          border:       `1px solid ${C.border}`,
          borderRadius: "0.4rem",
          color:        value === "all" ? C.fgMuted : C.primary,
          fontSize:     "0.72rem",
          fontWeight:   600,
          padding:      "0.25rem 0.5rem",
          cursor:       "pointer",
          whiteSpace:   "nowrap",
        }}
      >
        {current?.label ?? "All Months"}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      {open && (
        <div style={{
          position:   "absolute",
          top:        "calc(100% + 4px)",
          left:       0,
          background: C.surfaceEl,
          border:     `1px solid ${C.border}`,
          borderRadius:"0.4rem",
          zIndex:     200,
          minWidth:   "130px",
          boxShadow:  "0 8px 24px rgba(0,0,0,0.4)",
          overflow:   "hidden",
          maxHeight:  "220px",
          overflowY:  "auto",
        }}>
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false); }}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                padding:    "0.4rem 0.75rem",
                background: o.key === value ? C.surfaceHov : "transparent",
                border:     "none",
                color:      o.key === "all" ? C.fg : C.primary,
                fontSize:   "0.75rem",
                cursor:     "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
interface ReadTransactionsProps extends OnCloseProps {
  initialTypeFilter?:  TypeFilter;
  initialMonthFilter?: string; // "all" or "YYYY-MM"
}

export default function ReadTransactions({ onClose, initialTypeFilter = "all", initialMonthFilter = "all" }: ReadTransactionsProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;
  const isAdmin  = userRole === 1;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [transactions, setTransactions] = useState<ReadTransaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [viewMode,     setViewMode]     = useState<"all" | "own">("all");

  // Sort & filter state
  const [sortField,  setSortField]  = useState<SortField>("id");
  const [sortDir,    setSortDir]    = useState<SortDir>("desc");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>(initialTypeFilter);
  const [monthFilter, setMonthFilter] = useState<string>(initialMonthFilter);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token || !tokenType) return;
        const [transRes, catRes] = await Promise.all([
          api.get("api/transactions/", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
          api.get("api/categories/"),
        ]);
        const filtered: ReadTransaction[] = transRes.data
          .filter((t: ReadTransaction) => !t.deleted_at)
          .sort((a: ReadTransaction, b: ReadTransaction) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setTransactions(filtered);
        setCategories(catRes.data);
      } catch { /* silently */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, [token, tokenType]);

  const getCategoryName = (id: number) =>
    categories.find(c => c.id === id)?.name ?? "Unknown";

  // ── Handle column header click ─────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "id" ? "desc" : "asc");
    }
  };

  // ── Derive available months from loaded transactions ──────────────────────
  const availableMonths = useMemo(() => {
    let txs = [...transactions];
    if (viewMode === "own") txs = txs.filter(t => t.user_id === user?.id);
    const monthSet = new Set<string>();
    txs.forEach(t => {
      const ym = t.transaction_date?.slice(0, 7);
      if (ym) monthSet.add(ym);
    });
    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return [
      { key: "all", label: "All Months" },
      ...sorted.map(ym => {
        const [year, month] = ym.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1)
          .toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return { key: ym, label };
      }),
    ];
  }, [transactions, viewMode, user]);

  // ── Apply view mode + month filter + type filter + sort ───────────────────
  const processed = (() => {
    let txs = [...transactions];

    if (viewMode === "own") txs = txs.filter(t => t.user_id === user?.id);
    if (monthFilter !== "all") txs = txs.filter(t => t.transaction_date?.startsWith(monthFilter));
    if (typeFilter  !== "all") txs = txs.filter(t => t.transaction_type === typeFilter);

    // Sort
    txs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "id":               cmp = a.id - b.id;                                           break;
        case "user_id":          cmp = a.user_id - b.user_id;                                  break;
        case "category":         cmp = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id)); break;
        case "amount":           cmp = parseFloat(String(a.amount)) - parseFloat(String(b.amount));                                    break;
        case "transaction_date": cmp = a.transaction_date.localeCompare(b.transaction_date);   break;
        case "created_at":       cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return txs;
  })();

  // ── Sortable TH ───────────────────────────────────────────────────────────
  const Th = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const active = sortField === field;
    return (
      <th
        style={{
          padding:         "0.6rem 0.75rem",
          fontSize:        "0.7rem",
          fontWeight:      600,
          color:           active ? C.primary : C.fgMuted,
          textTransform:   "uppercase",
          letterSpacing:   "0.05em",
          whiteSpace:      "nowrap",
          borderBottom:    `1px solid ${C.border}`,
          background:      C.surfaceEl,
          userSelect:      "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <button
            onClick={() => handleSort(field)}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "0.25rem",
              background: "none",
              border:     "none",
              color:      "inherit",
              fontSize:   "inherit",
              fontWeight: "inherit",
              cursor:     "pointer",
              padding:    0,
            }}
          >
            {children}
            <SortIcon field={field} active={sortField} dir={sortDir} />
          </button>
        </div>
      </th>
    );
  };

  const totalIncome  = processed.filter(t => t.transaction_type === "Income") .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const totalExpense = processed.filter(t => t.transaction_type === "Expense").reduce((s, t) => s + parseFloat(String(t.amount)), 0);

  return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* ── Header (sticky) ───────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "1.25rem 1.5rem",
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            View Transactions
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            {processed.length} record{processed.length !== 1 ? "s" : ""}
            {typeFilter  !== "all" ? ` · ${typeFilter} only` : ""}
            {monthFilter !== "all" ? ` · ${availableMonths.find(m => m.key === monthFilter)?.label ?? monthFilter}` : ""}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Admin: view toggle */}
          {isAdmin && (
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as "all" | "own")}
              style={{
                background:   C.surfaceEl,
                border:       `1px solid ${C.border}`,
                borderRadius: "0.4rem",
                color:        C.fg,
                fontSize:     "0.75rem",
                padding:      "0.3rem 0.5rem",
                cursor:       "pointer",
                outline:      "none",
              }}
            >
              <option value="all">All Users</option>
              <option value="own">My Transactions</option>
            </select>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background:   "transparent",
              border:       `1px solid ${C.border}`,
              borderRadius: "0.5rem",
              color:        C.fgMuted,
              cursor:       "pointer",
              padding:      "0.3rem",
              display:      "flex",
              alignItems:   "center",
            }}
          >
            <X style={{ width: "1rem", height: "1rem" }} />
          </button>
        </div>
      </div>

      {/* ── Summary pills ────────────────────────────────────────────────────── */}
      {!loading && processed.length > 0 && (
        <div style={{
          display:      "flex",
          gap:          "0.75rem",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
        }}>
          {[
            { label: "Income",  value: `+₱${totalIncome.toLocaleString()}`,   color: C.income,  bg: "hsl(160 60% 45% / 0.1)"  },
            { label: "Expense", value: `-₱${totalExpense.toLocaleString()}`,   color: C.expense, bg: "hsl(0 72% 51% / 0.1)"    },
            { label: "Net",     value: `₱${(totalIncome - totalExpense).toLocaleString()}`,
              color: (totalIncome - totalExpense) >= 0 ? C.income : C.expense,
              bg:    (totalIncome - totalExpense) >= 0 ? "hsl(160 60% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)" },
          ].map(p => (
            <div key={p.label} style={{
              background:   p.bg,
              border:       `1px solid ${p.color}40`,
              borderRadius: "0.4rem",
              padding:      "0.3rem 0.75rem",
              fontSize:     "0.75rem",
            }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Table area (scrollable) ──────────────────────────────────────────── */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>
        )}
        {!loading && processed.length === 0 && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>No transactions found.</p>
        )}

        {!loading && processed.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <Th field="id">ID</Th>
                {isAdmin && <Th field="user_id">User ID</Th>}
                <Th field="category">Category</Th>
                <Th field="amount">Amount</Th>
                <th style={{
                  padding:       "0.6rem 0.75rem",
                  fontSize:      "0.7rem",
                  fontWeight:    600,
                  color:         C.fgMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom:  `1px solid ${C.border}`,
                  background:    C.surfaceEl,
                }}>
                  <TypeDropdown value={typeFilter} onChange={setTypeFilter} />
                </th>
                <th style={{
                  padding:       "0.6rem 0.75rem",
                  fontSize:      "0.7rem",
                  fontWeight:    600,
                  color:         C.fgMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom:  `1px solid ${C.border}`,
                  background:    C.surfaceEl,
                }}>
                  Description
                </th>
                <th style={{
                  padding:       "0.6rem 0.75rem",
                  fontSize:      "0.7rem",
                  fontWeight:    600,
                  color:         C.fgMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom:  `1px solid ${C.border}`,
                  background:    C.surfaceEl,
                }}>
                  <MonthDropdown
                    value={monthFilter}
                    options={availableMonths}
                    onChange={setMonthFilter}
                  />
                </th>
                <Th field="created_at">Created At</Th>
              </tr>
            </thead>

            <tbody>
              {processed.map((tx, idx) => {
                const isIncome  = tx.transaction_type === "Income";
                const isEven    = idx % 2 === 0;
                return (
                  <tr
                    key={tx.id}
                    style={{
                      backgroundColor: isEven ? "transparent" : "hsl(220,14%,14%)",
                      transition:      "background-color 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? "transparent" : "hsl(220,14%,14%)")}
                  >
                    <td style={td}>{tx.id}</td>
                    {isAdmin && <td style={td}>{tx.user_id}</td>}
                    <td style={td}>{getCategoryName(tx.category_id)}</td>
                    <td style={{ ...td, fontWeight: 600, color: isIncome ? C.income : C.expense }}>
                      {isIncome
                        ? `+₱${formatCurrency(tx.amount).replace("₱ ", "")}`
                        : `-₱${formatCurrency(tx.amount).replace("₱ ", "")}`}
                    </td>
                    <td style={td}>
                      <span style={{
                        display:         "inline-block",
                        padding:         "0.15rem 0.5rem",
                        borderRadius:    "999px",
                        fontSize:        "0.68rem",
                        fontWeight:      600,
                        backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
                        color:           isIncome ? C.income : C.expense,
                        border:          `1px solid ${isIncome ? C.income : C.expense}40`,
                      }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td style={{ ...td, color: C.fgMuted, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description || "—"}
                    </td>
                    <td style={td}>{tx.transaction_date}</td>
                    <td style={{ ...td, color: C.fgMuted }}>{formatDate(tx.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer row count ─────────────────────────────────────────────────── */}
      {!loading && processed.length > 0 && (
        <div style={{
          padding:      "0.6rem 1.5rem",
          borderTop:    `1px solid ${C.border}`,
          fontSize:     "0.72rem",
          color:        C.fgMuted,
          flexShrink:   0,
        }}>
          Showing {processed.length} transaction{processed.length !== 1 ? "s" : ""}
          {processed.length > 15 ? " · scroll to see more" : ""}
        </div>
      )}

    </Shell>
  );
}

// ── Base TD style ─────────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding:     "0.55rem 0.75rem",
  color:       "hsl(220,14%,85%)",
  borderBottom:"1px solid hsl(220,16%,18%)",
  whiteSpace:  "nowrap",
};