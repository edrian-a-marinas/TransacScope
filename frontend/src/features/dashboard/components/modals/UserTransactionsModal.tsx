// UserTransactionsModal.tsx
// Step 1 → pick a user | Step 2 → see their transactions
// No new endpoint needed: filters GET /api/transactions/ by user_id on the frontend.
import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown, ArrowLeft, Receipt,
} from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import type { ReadUserWithCount } from "@/features/dashboard/schemas/user";
import type { Category, ReadTransaction } from "@/features/dashboard/schemas/transaction";
import { ShellTable } from "./shared/Shell";
import { C } from "./shared";

// ── Types ─────────────────────────────────────────────────────────────────────
type SortField  = "id" | "category" | "amount" | "transaction_date" | "created_at";
type SortDir    = "asc" | "desc";
type TypeFilter = "all" | "Income" | "Expense";

// ── Shared cell styles ────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding: "0.55rem 0.75rem", color: "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};
const thBase: React.CSSProperties = {
  padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 600,
  color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em",
  borderBottom: `1px solid ${C.border}`, background: C.surfaceEl, whiteSpace: "nowrap",
};

// ── Avatar helpers ────────────────────────────────────────────────────────────
const palette = [
  "hsl(199,89%,38%)", "hsl(160,60%,45%)", "hsl(280,60%,55%)",
  "hsl(30,90%,56%)",  "hsl(340,65%,55%)", "hsl(45,85%,50%)",
];
const avatarColor = (id: number) => palette[id % palette.length];
const getInitials = (u: ReadUserWithCount) =>
  ((u.first_name?.trim()[0] ?? "") + (u.last_name?.trim()[0] ?? "")).toUpperCase() || "?";

// ── Portal dropdown (same pattern as ReadTransactionModal) ────────────────────
function PortalDropdown({ anchorRef, open, onClose, children }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, minWidth: r.width });
  }, [open, anchorRef]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return createPortal(
    <div style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.minWidth, 130), background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", zIndex: 99999, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: "220px", overflowY: "auto" }}>
      {children}
    </div>,
    document.body
  );
}

// ── TypeDropdown ──────────────────────────────────────────────────────────────
function TypeDropdown({ value, onChange }: { value: TypeFilter; onChange: (v: TypeFilter) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const opts: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All Types" }, { value: "Income", label: "Income Only" }, { value: "Expense", label: "Expense Only" },
  ];
  return (
    <div>
      <button ref={ref} onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: value === "Income" ? C.income : value === "Expense" ? C.expense : C.fgMuted, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
        {opts.find(o => o.value === value)!.label}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      <PortalDropdown anchorRef={ref} open={open} onClose={() => setOpen(false)}>
        {opts.map(o => (
          <button key={o.value} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(o.value); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "0.4rem 0.75rem", background: o.value === value ? C.surfaceHov : "transparent", border: "none", color: o.value === "Income" ? C.income : o.value === "Expense" ? C.expense : C.fg, fontSize: "0.75rem", cursor: "pointer" }}>
            {o.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ── MonthDropdown ─────────────────────────────────────────────────────────────
function MonthDropdown({ value, options, onChange }: { value: string; options: { key: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button ref={ref} onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: value === "all" ? C.fgMuted : C.primary, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
        {options.find(o => o.key === value)?.label ?? "All Months"}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      <PortalDropdown anchorRef={ref} open={open} onClose={() => setOpen(false)}>
        {options.map(o => (
          <button key={o.key} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(o.key); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "0.4rem 0.75rem", background: o.key === value ? C.surfaceHov : "transparent", border: "none", color: o.key === "all" ? C.fg : C.primary, fontSize: "0.75rem", cursor: "pointer" }}>
            {o.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const s = { width: "0.7rem", height: "0.7rem" };
  if (active !== field) return <ArrowUpDown style={{ ...s, opacity: 0.35 }} />;
  return dir === "asc" ? <ArrowUp style={{ ...s, color: C.primary }} /> : <ArrowDown style={{ ...s, color: C.primary }} />;
}

// ── Role badge helper ─────────────────────────────────────────────────────────
function RoleBadge({ u }: { u: ReadUserWithCount }) {
  const isSA = u.id === 1 && u.role_id === 1;
  const isAdm = u.role_id === 1;
  const color = isSA ? C.warning : isAdm ? C.income : C.primary;
  const bg    = isSA ? "hsl(45 85% 50% / 0.12)" : isAdm ? "hsl(160 60% 45% / 0.12)" : "hsl(199 89% 38% / 0.12)";
  return (
    <span style={{ display: "inline-block", padding: "0.1rem 0.45rem", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700, backgroundColor: bg, color, border: `1px solid ${color}40`, flexShrink: 0 }}>
      {isSA ? "Super Admin" : isAdm ? "Admin" : "Standard"}
    </span>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1 — User picker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UserPicker({ users, loading, onSelect, onClose, handleMouseDown, handleMouseUp }: {
  users: ReadUserWithCount[]; loading: boolean;
  onSelect: (u: ReadUserWithCount) => void; onClose: () => void;
  handleMouseDown: React.MouseEventHandler; handleMouseUp: React.MouseEventHandler;
}) {
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "standard">("all");
  const [hovered,    setHovered]    = useState<number | null>(null);

  const filtered = useMemo(() => {
    let rows = [...users];
    if (roleFilter === "admin")    rows = rows.filter(u => u.role_id === 1);
    if (roleFilter === "standard") rows = rows.filter(u => u.role_id === 2);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(u =>
        u.email.toLowerCase().includes(q) ||
        `${u.first_name ?? ""} ${u.last_name ?? ""}`.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    }
    return rows;
  }, [users, roleFilter, search]);

  // summary pills for picker
  const pills = useMemo(() => [
    { label: "Admins",   value: users.filter(u => u.role_id === 1).length, color: C.income  },
    { label: "Standard", value: users.filter(u => u.role_id === 2).length, color: C.primary },
    { label: "Active",   value: users.filter(u => u.is_active).length,     color: C.income  },
  ], [users]);

  return (
    <ShellTable onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt style={{ width: "1rem", height: "1rem", color: C.primary }} />
            <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>User Transactions</h2>
          </div>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            Select a user to view their transactions
          </p>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer", padding: "0.3rem", display: "flex", alignItems: "center" }}>
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* Summary pills */}
      {!loading && users.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {pills.map(p => (
            <div key={p.label} style={{ background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: "0.4rem", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search + role filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID…"
          style={{ flex: 1, background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.45rem", color: C.fg, fontSize: "0.8rem", padding: "0.4rem 0.75rem", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = C.primary)}
          onBlur={e  => (e.target.style.borderColor = C.border)}
        />
        {(["all", "admin", "standard"] as const).map(r => {
          const active = roleFilter === r;
          const col    = r === "admin" ? C.income : r === "standard" ? C.primary : C.fgMuted;
          const bg     = r === "admin" ? "hsl(160 60% 45% / 0.12)" : r === "standard" ? "hsl(199 89% 38% / 0.12)" : C.surfaceEl;
          return (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{ padding: "0.3rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, border: `1px solid ${active ? col : C.border}`, background: active ? bg : "transparent", color: active ? col : C.fgMuted, cursor: "pointer", whiteSpace: "nowrap" }}>
              {r === "all" ? "All" : r === "admin" ? "Admin" : "Standard"}
            </button>
          );
        })}
      </div>

      {/* User list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading users…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>No users found.</p>
        )}
        {!loading && filtered.map(u => {
          const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
          const color    = avatarColor(u.id);
          const isHov    = hovered === u.id;
          return (
            <div key={u.id} onClick={() => onSelect(u)}
              onMouseEnter={() => setHovered(u.id)} onMouseLeave={() => setHovered(null)}
              style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1.5rem", cursor: "pointer", borderBottom: `1px solid ${C.border}`, background: isHov ? C.surfaceHov : "transparent", transition: "background 0.1s" }}>

              {/* Avatar */}
              <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: "0.8rem", color: "#fff", boxShadow: `0 0 0 2px ${color}30` }}>
                {getInitials(u)}
              </div>

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <p style={{ color: C.fg, fontSize: "0.85rem", fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fullName || "—"}
                  </p>
                  <RoleBadge u={u} />
                  {!u.is_active && (
                    <span style={{ display: "inline-block", padding: "0.1rem 0.4rem", borderRadius: "999px", fontSize: "0.62rem", fontWeight: 600, background: "hsl(220 10% 46% / 0.12)", color: C.fgMuted, border: `1px solid ${C.fgMuted}40` }}>Inactive</span>
                  )}
                </div>
                <p style={{ color: C.fgMuted, fontSize: "0.73rem", margin: "0.1rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
              </div>

              {/* Tx count + ID */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ color: C.primary, fontSize: "0.82rem", fontWeight: 700, margin: 0 }}>
                  {u.transaction_count ?? 0} tx
                </p>
                <p style={{ color: C.fgMuted, fontSize: "0.68rem", margin: "0.1rem 0 0" }}>ID #{u.id}</p>
              </div>

              <ChevronDown style={{ width: "0.85rem", height: "0.85rem", color: C.fgMuted, transform: "rotate(-90deg)", flexShrink: 0 }} />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!loading && (
        <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.fgMuted, flexShrink: 0 }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          {filtered.length > 10 ? " · scroll to see more" : ""}
        </div>
      )}
    </ShellTable>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2 — Transaction table for the selected user
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function UserTxTable({ selectedUser, transactions, categories, txLoading, onBack, onClose, handleMouseDown, handleMouseUp }: {
  selectedUser: ReadUserWithCount; transactions: ReadTransaction[];
  categories: Category[]; txLoading: boolean;
  onBack: () => void; onClose: () => void;
  handleMouseDown: React.MouseEventHandler; handleMouseUp: React.MouseEventHandler;
}) {
  const [sortField,   setSortField]   = useState<SortField>("id");
  const [sortDir,     setSortDir]     = useState<SortDir>("desc");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const fullName = [selectedUser.first_name, selectedUser.middle_name, selectedUser.last_name].filter(Boolean).join(" ");
  const color    = avatarColor(selectedUser.id);

  const getCatName = (id: number) => categories.find(c => c.id === id)?.name ?? "Unknown";

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir(f === "id" ? "desc" : "asc"); }
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => { const ym = t.transaction_date?.slice(0, 7); if (ym) set.add(ym); });
    return [
      { key: "all", label: "All Months" },
      ...Array.from(set).sort((a, b) => b.localeCompare(a)).map(ym => {
        const [y, m] = ym.split("-");
        return { key: ym, label: new Date(+y, +m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" }) };
      }),
    ];
  }, [transactions]);

  const processed = useMemo(() => {
    let txs = [...transactions];
    if (monthFilter !== "all") txs = txs.filter(t => t.transaction_date?.startsWith(monthFilter));
    if (typeFilter  !== "all") txs = txs.filter(t => t.transaction_type === typeFilter);
    txs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "id":               cmp = a.id - b.id; break;
        case "category":         cmp = getCatName(a.category_id).localeCompare(getCatName(b.category_id)); break;
        case "amount":           cmp = parseFloat(String(a.amount)) - parseFloat(String(b.amount)); break;
        case "transaction_date": cmp = a.transaction_date.localeCompare(b.transaction_date); break;
        case "created_at":       cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return txs;
  }, [transactions, typeFilter, monthFilter, sortField, sortDir]);

  const totalIncome  = processed.filter(t => t.transaction_type === "Income") .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const totalExpense = processed.filter(t => t.transaction_type === "Expense").reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const net = totalIncome - totalExpense;

  const Th = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th style={{ ...thBase, color: sortField === field ? C.primary : C.fgMuted, userSelect: "none" }}>
      <button onClick={() => handleSort(field)}
        style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", color: "inherit", fontSize: "inherit", fontWeight: "inherit", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
        {children}
        <SortIcon field={field} active={sortField} dir={sortDir} />
      </button>
    </th>
  );

  return (
    <ShellTable onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>

          {/* Back button */}
          <button onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.45rem", color: C.fgMuted, fontSize: "0.75rem", fontWeight: 600, padding: "0.35rem 0.65rem", cursor: "pointer", flexShrink: 0, transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.primary; (e.currentTarget as HTMLElement).style.color = C.fg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border;  (e.currentTarget as HTMLElement).style.color = C.fgMuted; }}>
            <ArrowLeft style={{ width: "0.75rem", height: "0.75rem" }} /> Back
          </button>

          {/* User identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
            <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: "0.7rem", color: "#fff" }}>
              {getInitials(selectedUser)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                <p style={{ color: C.fg, fontSize: "0.9rem", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fullName || selectedUser.email}
                </p>
                <RoleBadge u={selectedUser} />
              </div>
              <p style={{ color: C.fgMuted, fontSize: "0.72rem", margin: "0.1rem 0 0" }}>
                ID #{selectedUser.id} · {processed.length} transaction{processed.length !== 1 ? "s" : ""}
                {typeFilter  !== "all" ? ` · ${typeFilter} only` : ""}
                {monthFilter !== "all" ? ` · ${availableMonths.find(m => m.key === monthFilter)?.label}` : ""}
              </p>
            </div>
          </div>
        </div>

        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer", padding: "0.3rem", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* Summary pills */}
      {!txLoading && processed.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            { label: "Income",  value: `+₱${totalIncome.toLocaleString()}`,  color: C.income,  bg: "hsl(160 60% 45% / 0.1)"   },
            { label: "Expense", value: `-₱${totalExpense.toLocaleString()}`, color: C.expense, bg: "hsl(0 72% 51% / 0.1)"      },
            { label: "Net",     value: `₱${net.toLocaleString()}`,           color: net >= 0 ? C.income : C.expense, bg: net >= 0 ? "hsl(160 60% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)" },
          ].map(p => (
            <div key={p.label} style={{ background: p.bg, border: `1px solid ${p.color}40`, borderRadius: "0.4rem", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {txLoading && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading transactions…</p>}
        {!txLoading && processed.length === 0 && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>
            {transactions.length === 0 ? "This user has no transactions yet." : "No transactions match the current filters."}
          </p>
        )}
        {!txLoading && processed.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <Th field="id">ID</Th>
                <Th field="category">Category</Th>
                <Th field="amount">Amount</Th>
                <th style={thBase}><TypeDropdown value={typeFilter} onChange={setTypeFilter} /></th>
                <th style={thBase}>Description</th>
                <th style={thBase}><MonthDropdown value={monthFilter} options={availableMonths} onChange={setMonthFilter} /></th>
                <Th field="created_at">Created At</Th>
              </tr>
            </thead>
            <tbody>
              {processed.map((tx, idx) => {
                const isIncome = tx.transaction_type === "Income";
                const isEven   = idx % 2 === 0;
                return (
                  <tr key={tx.id}
                    style={{ backgroundColor: isEven ? "transparent" : "hsl(220,14%,14%)", transition: "background-color 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? "transparent" : "hsl(220,14%,14%)")}>
                    <td style={td}>{tx.id}</td>
                    <td style={td}>{getCatName(tx.category_id)}</td>
                    <td style={{ ...td, fontWeight: 600, color: isIncome ? C.income : C.expense }}>
                      {isIncome ? `+₱${formatCurrency(tx.amount).replace("₱ ", "")}` : `-₱${formatCurrency(tx.amount).replace("₱ ", "")}`}
                    </td>
                    <td style={td}>
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600, backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)", color: isIncome ? C.income : C.expense, border: `1px solid ${isIncome ? C.income : C.expense}40` }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td style={{ ...td, color: C.fgMuted, maxWidth: "180px" }}>{tx.description || "—"}</td>
                    <td style={td}>{tx.transaction_date}</td>
                    <td style={{ ...td, color: C.fgMuted }}>{formatDate(tx.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!txLoading && processed.length > 0 && (
        <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.fgMuted, flexShrink: 0 }}>
          Showing {processed.length} transaction{processed.length !== 1 ? "s" : ""}
          {processed.length > 15 ? " · scroll to see more" : ""}
        </div>
      )}
    </ShellTable>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT — wires step 1 → step 2, fetches everything once
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function UserTransactionsModal({ onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [users,        setUsers]        = useState<ReadUserWithCount[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [allTx,        setAllTx]        = useState<ReadTransaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [txLoading,    setTxLoading]    = useState(true);
  const [selectedUser, setSelectedUser] = useState<ReadUserWithCount | null>(null);

  // Fetch everything in parallel on mount — no extra endpoints needed
  useEffect(() => {
    if (!token || !tokenType || !user) return;
    const headers = { Authorization: `${tokenType} ${token}` };
    Promise.all([
      api.get("api/users/",        { headers }),
      api.get("api/transactions/", { headers }),
      api.get("api/categories/"),
    ]).then(([uRes, txRes, catRes]) => {
      setUsers(uRes.data);
      setAllTx(
        (txRes.data as ReadTransaction[])
          .filter(t => !t.deleted_at)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
      setCategories(catRes.data);
    }).catch(() => {}).finally(() => {
      setUsersLoading(false);
      setTxLoading(false);
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Only the selected user's transactions — pure client-side filter
  const userTx = useMemo(
    () => selectedUser ? allTx.filter(t => t.user_id === selectedUser.id) : [],
    [allTx, selectedUser]
  );

  if (selectedUser) {
    return (
      <UserTxTable
        selectedUser={selectedUser}
        transactions={userTx}
        categories={categories}
        txLoading={txLoading}
        onBack={() => setSelectedUser(null)}
        onClose={onClose}
        handleMouseDown={handleMouseDown}
        handleMouseUp={handleMouseUp}
      />
    );
  }

  return (
    <UserPicker
      users={users}
      loading={usersLoading}
      onSelect={setSelectedUser}
      onClose={onClose}
      handleMouseDown={handleMouseDown}
      handleMouseUp={handleMouseUp}
    />
  );
}