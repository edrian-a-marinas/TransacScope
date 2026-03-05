import { useState, useContext } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";

import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { Transaction, Category } from "@/features/dashboard/schemas/transaction";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { diffHighlight, formatCurrency, fetchTransactionAndCategories } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";

// ── Same tokens as all other modals ──────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  border:     "hsl(220,16%,22%)",
  borderFoc:  "hsl(199,89%,38%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  error:      "hsl(0,72%,60%)",
  overlay:    "rgba(0,0,0,0.55)",
  diffDel:    "hsl(0,72%,51%)",
  diffIns:    "hsl(160,60%,45%)",
};

const inputStyle: React.CSSProperties = {
  width:           "100%",
  backgroundColor: C.surfaceEl,
  border:          `1px solid ${C.border}`,
  borderRadius:    "0.5rem",
  color:           C.fg,
  fontSize:        "0.875rem",
  padding:         "0.5rem 0.75rem",
  outline:         "none",
  transition:      "border-color 0.15s",
  boxSizing:       "border-box",
};

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "0.75rem",
  fontWeight:    500,
  color:         C.fgMuted,
  marginBottom:  "0.35rem",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

// ── Shell — defined outside to prevent remount/focus-loss on re-render ────────
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
          maxWidth:     "420px",
          padding:      "1.75rem",
          position:     "relative",
          boxShadow:    "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Read-only info row ────────────────────────────────────────────────────────
function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      padding:        "0.45rem 0",
      borderBottom:   `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: "0.75rem", color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: color ?? C.fg }}>
        {value}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UpdateTransaction({ onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const userId    = user!.id;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [transactionId,    setTransactionId]    = useState("");
  const [transaction,      setTransaction]      = useState<Transaction | null>(null);
  const [categories,       setCategories]       = useState<Category[]>([]);
  const [form,             setForm]             = useState({ description: "", transaction_date: "" });
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [focusedField,     setFocusedField]     = useState<string | null>(null);

  const getCategoryName = (id: number) =>
    categories.find(c => c.id === id)?.name ?? "Unknown";

  const handleFetch = async () => {
    setError("");
    setTransaction(null);
    const idNum = Number(transactionId);
    if (!idNum || idNum <= 0 || idNum > 999) {
      setError("Enter a valid ID between 1 and 999.");
      return;
    }
    try {
      setLoading(true);
      const { transaction, categories } = await fetchTransactionAndCategories(idNum);
      if (transaction.user_id !== userId) {
        setError("You do not have permission to update this transaction.");
        return;
      }
      setTransaction(transaction);
      setCategories(categories);
      setForm({
        description:      transaction.description ?? "",
        transaction_date: transaction.transaction_date,
      });
    } catch {
      setError("Invalid transaction ID or insufficient permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleFetch();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProceed = () => {
    if (!transaction) return;
    if (
      form.description      === (transaction.description ?? "") &&
      form.transaction_date === transaction.transaction_date
    ) {
      setError("Nothing to update.");
      return;
    }
    setError("");
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    if (!transaction) return;
    if (!token || !tokenType) return alert("Not authorized");

    const payload: any = {};
    if (form.description      !== (transaction.description ?? ""))  payload.description      = form.description;
    if (form.transaction_date !== transaction.transaction_date)      payload.transaction_date = form.transaction_date;

    try {
      await api.put(`api/transactions/${transactionId}`, payload, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      alert("Updated successfully!");
      setShowConfirmation(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update transaction.");
    }
  };

  // ── Step 1 — ID lookup ───────────────────────────────────────────────────
  if (!transaction) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Edit Transaction
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            Enter the transaction ID to load
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer",
            padding: "0.3rem", display: "flex", alignItems: "center",
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* ID input */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>Transaction ID</label>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            value={transactionId}
            placeholder="e.g. 42"
            onChange={e => {
              const val = e.target.value;
              if (/^\d{0,3}$/.test(val)) setTransactionId(val);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocusedField("id")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              paddingRight: "2.5rem",
              borderColor: focusedField === "id" ? C.borderFoc : C.border,
            }}
          />
          <Search style={{
            position: "absolute", right: "0.75rem", top: "50%",
            transform: "translateY(-50%)", width: "0.9rem", height: "0.9rem",
            color: C.fgMuted, pointerEvents: "none",
          }} />
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: "hsl(0 72% 51% / 0.1)", border: `1px solid ${C.error}`,
          borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "1rem",
        }}>
          <p style={{ color: C.error, fontSize: "0.8rem", margin: 0 }}>• {error}</p>
        </div>
      )}

      {loading && (
        <p style={{ color: C.fgMuted, fontSize: "0.8rem", margin: "0 0 1rem" }}>Loading…</p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleFetch}
          disabled={loading || !transactionId}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: !transactionId ? C.surfaceEl : C.primary,
            color: !transactionId ? C.fgMuted : "hsl(0,0%,100%)",
            fontSize: "0.875rem", fontWeight: 600, cursor: !transactionId ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          Load Transaction <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>
    </Shell>
  );

  // ── Step 2 — Edit form ───────────────────────────────────────────────────
  if (!showConfirmation) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Edit Transaction
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            ID #{transactionId}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer",
            padding: "0.3rem", display: "flex", alignItems: "center",
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* Read-only snapshot */}
      <div style={{ marginBottom: "1.25rem" }}>
        <InfoRow label="Amount"   value={formatCurrency(transaction.amount)}
          color={transaction.transaction_type === "Income" ? C.income : C.expense} />
        <InfoRow label="Category" value={getCategoryName(transaction.category_id)} />
        <InfoRow label="Type"     value={transaction.transaction_type}
          color={transaction.transaction_type === "Income" ? C.income : C.expense} />
      </div>

      {/* Editable fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>Description</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Optional note…"
            onFocus={() => setFocusedField("description")}
            onBlur={() => setFocusedField(null)}
            style={{ ...inputStyle, borderColor: focusedField === "description" ? C.borderFoc : C.border }}
          />
        </div>
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date"
            name="transaction_date"
            value={form.transaction_date}
            onChange={handleChange}
            onFocus={() => setFocusedField("transaction_date")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === "transaction_date" ? C.borderFoc : C.border,
              colorScheme: "dark",
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: "hsl(0 72% 51% / 0.1)", border: `1px solid ${C.error}`,
          borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "1rem",
        }}>
          <p style={{ color: C.error, fontSize: "0.8rem", margin: 0 }}>• {error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => setTransaction(null)}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
        </button>
        <button
          onClick={handleProceed}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.primary,
            color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          Review Changes <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>
    </Shell>
  );

  // ── Step 3 — Confirm diff ────────────────────────────────────────────────
  const descDiff = diffHighlight(transaction.description ?? "", form.description);
  const dateDiff = diffHighlight(transaction.transaction_date, form.transaction_date);

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Confirm Update
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            Review changes for ID #{transactionId}
          </p>
        </div>
        <button
          onClick={() => setShowConfirmation(false)}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer",
            padding: "0.3rem", display: "flex", alignItems: "center",
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* Diff table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Description", before: descDiff.before, after: descDiff.after },
          { label: "Date",        before: dateDiff.before, after: dateDiff.after },
        ].map(({ label, before, after }) => (
          <div
            key={label}
            style={{
              background:   C.surfaceEl,
              border:       `1px solid ${C.border}`,
              borderRadius: "0.5rem",
              overflow:     "hidden",
            }}
          >
            <div style={{
              padding:     "0.3rem 0.75rem",
              borderBottom:`1px solid ${C.border}`,
              fontSize:    "0.7rem",
              fontWeight:  600,
              color:       C.fgMuted,
              textTransform:"uppercase",
              letterSpacing:"0.05em",
            }}>
              {label}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div style={{
                padding:     "0.5rem 0.75rem",
                borderRight: `1px solid ${C.border}`,
                fontSize:    "0.8rem",
              }}>
                <span style={{ display: "block", fontSize: "0.65rem", color: C.expense, marginBottom: "0.2rem", fontWeight: 600 }}>
                  BEFORE
                </span>
                <span
                  style={{ color: C.fg }}
                  dangerouslySetInnerHTML={{ __html: before }}
                />
              </div>
              <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
                <span style={{ display: "block", fontSize: "0.65rem", color: C.income, marginBottom: "0.2rem", fontWeight: 600 }}>
                  AFTER
                </span>
                <span
                  style={{ color: C.fg }}
                  dangerouslySetInnerHTML={{ __html: after }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          backgroundColor: "hsl(0 72% 51% / 0.1)", border: `1px solid ${C.error}`,
          borderRadius: "0.5rem", padding: "0.6rem 0.75rem", marginBottom: "1rem",
        }}>
          <p style={{ color: C.error, fontSize: "0.8rem", margin: 0 }}>• {error}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => setShowConfirmation(false)}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
        </button>
        <button
          onClick={handleConfirmUpdate}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: C.income,
            color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          Confirm Update
        </button>
      </div>
    </Shell>
  );
}