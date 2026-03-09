import { useState, useContext } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { Transaction, Category } from "@/features/dashboard/schemas/transaction";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { diffHighlight, formatCurrency, fetchTransactionAndCategories } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import Shell from "./shared/Shell";
import ModalHeader from "./shared/ModalHeader";
import ErrorBox from "./shared/ErrorBox";
import InfoRow from "./shared/InfoRow";
import { C, inputStyle, labelStyle } from "./shared";

type Step = "lookup" | "edit" | "confirm";

export default function UpdateTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userId   = user!.id;
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [step,          setStep]          = useState<Step>("lookup");
  const [transactionId, setTransactionId] = useState("");
  const [transaction,   setTransaction]   = useState<Transaction | null>(null);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [form,          setForm]          = useState({ description: "", transaction_date: "", amount: "" });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [focusedField,  setFocusedField]  = useState<string | null>(null);

  const getCategoryName = (id: number) =>
    categories.find(c => c.id === id)?.name ?? "Unknown";

  const backBtnStyle: React.CSSProperties = {
    flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
    border: `1px solid ${C.border}`, background: "transparent",
    color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
  };
  const primaryBtnStyle: React.CSSProperties = {
    flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
    border: "none", background: C.primary,
    color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
  };

  const handleFetch = async () => {
    setError("");
    setTransaction(null);
    const idNum = Number(transactionId);
    if (!idNum || idNum <= 0 || idNum > 999) {
      setError("Enter a valid ID between 1 and 999.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchTransactionAndCategories(idNum);
      if (result.transaction.user_id !== userId) {
        setError("You do not have permission to update this transaction.");
        return;
      }
      setTransaction(result.transaction);
      setCategories(result.categories);
      setForm({
        description:      result.transaction.description ?? "",
        transaction_date: result.transaction.transaction_date,
        amount:           String(result.transaction.amount),
      });
      setStep("edit");
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
    // Amount: only allow valid decimal — up to 12 digits, 2 decimal places
    if (name === "amount") {
      if (value === "" || /^\d{0,12}(\.\d{0,2})?$/.test(value)) {
        setForm(prev => ({ ...prev, amount: value }));
      }
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProceed = () => {
    if (!transaction) return;

    const amountNum = parseFloat(form.amount);
    if (!form.amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    const originalAmount  = parseFloat(String(transaction.amount));
    const amountChanged   = amountNum !== originalAmount;
    const descChanged     = form.description      !== (transaction.description ?? "");
    const dateChanged     = form.transaction_date !== transaction.transaction_date;

    if (!amountChanged && !descChanged && !dateChanged) {
      setError("Nothing to update.");
      return;
    }

    setError("");
    setStep("confirm");
  };

  const handleConfirmUpdate = async () => {
    if (!transaction || !token || !tokenType) return;

    const payload: Record<string, string | number> = {};
    if (form.description      !== (transaction.description ?? ""))   payload.description      = form.description;
    if (form.transaction_date !== transaction.transaction_date)       payload.transaction_date = form.transaction_date;
    const amountNum = parseFloat(form.amount);
    if (amountNum !== parseFloat(String(transaction.amount)))        payload.amount           = amountNum;

    try {
      await api.put(`api/transactions/${transactionId}`, payload, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      alert("Updated successfully!");
      onClose();
    } catch {
      setError("Failed to update transaction.");
    }
  };

  // ── Step 1 — ID lookup ────────────────────────────────────────────────────
  if (step === "lookup") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title="Edit Transaction"
          subtitle="Enter the transaction ID to load"
          onClose={onClose}
        />
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}></div>
          <label style={labelStyle}>Transaction ID</label>
          <div style={{ position: "relative" }}>
            <input
              value={transactionId}
              placeholder="e.g. 42"
              onChange={e => { if (/^\d{0,3}$/.test(e.target.value)) setTransactionId(e.target.value); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocusedField("id")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, paddingRight: "2.5rem", borderColor: focusedField === "id" ? C.borderFoc : C.border }}
            />
            <Search style={{
              position: "absolute", right: "0.75rem", top: "50%",
              transform: "translateY(-50%)", width: "0.9rem", height: "0.9rem",
              color: C.fgMuted, pointerEvents: "none",
            }} />
          </div>
        </div>
        <ErrorBox message={error} />
        {loading && <p style={{ color: C.fgMuted, fontSize: "0.8rem", margin: "0 0 1rem" }}>Loading…</p>}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={onClose} style={backBtnStyle}>Cancel</button>
          <button
            onClick={handleFetch}
            disabled={loading || !transactionId}
            style={{
              ...primaryBtnStyle,
              background: !transactionId ? C.surfaceEl : C.primary,
              color:      !transactionId ? C.fgMuted   : "hsl(0,0%,100%)",
              cursor:     !transactionId ? "not-allowed" : "pointer",
            }}
          >
            Load Transaction <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
          </button>
        </div>
      </div>
    </Shell>
  );

  // ── Step 2 — Edit form ────────────────────────────────────────────────────
  if (step === "edit" && transaction) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title="Edit Transaction"
          subtitle={`ID #${transactionId}`}
          onClose={onClose}
        />
        {/* Read-only — category and type only */}
        <div style={{ marginBottom: "1.25rem" }}>
          <InfoRow label="Category" value={getCategoryName(transaction.category_id)} />
          <InfoRow label="Type"     value={transaction.transaction_type}
            color={transaction.transaction_type === "Income" ? C.income : C.expense} />
        </div>
        {/* Editable fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                color: C.fgMuted, fontSize: "0.85rem", pointerEvents: "none",
              }}>₱</span>
              <input
                type="text"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                onFocus={() => setFocusedField("amount")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle,
                  paddingLeft: "1.75rem",
                  borderColor: focusedField === "amount" ? C.borderFoc : C.border,
                }}
              />
            </div>
          </div>

          {/* Description */}
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

          {/* Date */}
          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              name="transaction_date"
              value={form.transaction_date}
              onChange={handleChange}
              onFocus={() => setFocusedField("transaction_date")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, colorScheme: "dark", borderColor: focusedField === "transaction_date" ? C.borderFoc : C.border }}
            />
          </div>

        </div>
        <ErrorBox message={error} />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => setStep("lookup")} style={backBtnStyle}>
            <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
          </button>
          <button onClick={handleProceed} style={primaryBtnStyle}>
            Review Changes <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
          </button>
        </div>
      </div>
    </Shell>
  );

  // ── Step 3 — Confirm diff ─────────────────────────────────────────────────
  if (step === "confirm" && transaction) {
    const originalAmount = parseFloat(String(transaction.amount)).toFixed(2);
    const newAmount      = parseFloat(form.amount).toFixed(2);
    const amountDiff     = diffHighlight(originalAmount, newAmount);
    const descDiff       = diffHighlight(transaction.description ?? "", form.description);
    const dateDiff       = diffHighlight(transaction.transaction_date, form.transaction_date);

    // Only show rows where something actually changed
    const diffRows = [
      { label: "Amount",      ...amountDiff },
      { label: "Description", ...descDiff   },
      { label: "Date",        ...dateDiff   },
    ].filter(r => r.before !== r.after);

    return (
      <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
        <div style={{ padding: "1.75rem" }}>
          <ModalHeader
            title="Confirm Update"
            subtitle={`Review changes for ID #${transactionId}`}
            onClose={() => setStep("edit")}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {diffRows.map(({ label, before, after }) => (
              <div key={label} style={{ background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.5rem", overflow: "hidden" }}>
                <div style={{ padding: "0.3rem 0.75rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.7rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {[
                    { side: "BEFORE", html: before, accent: C.expense, borderRight: true  },
                    { side: "AFTER",  html: after,  accent: C.income,  borderRight: false },
                  ].map(({ side, html, accent, borderRight }) => (
                    <div key={side} style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", borderRight: borderRight ? `1px solid ${C.border}` : undefined }}>
                      <span style={{ display: "block", fontSize: "0.65rem", color: accent, marginBottom: "0.2rem", fontWeight: 600 }}>{side}</span>
                      <span style={{ color: C.fg }} dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ErrorBox message={error} />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => setStep("edit")} style={backBtnStyle}>
              <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
            </button>
            <button onClick={handleConfirmUpdate} style={{ ...primaryBtnStyle, background: C.income }}>
              Confirm Update
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return null;
}