import { useState, useEffect, useContext } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { ChevronRight, ChevronLeft, Info } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { Transaction } from "@/features/dashboard/schemas/transaction";
import { transactionSchema } from "@/features/dashboard/schemas/transaction";
import type { CategoryRead } from "@/features/dashboard/schemas/category";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import Shell from "./shared/Shell";
import ModalHeader from "./shared/ModalHeader";
import ErrorBox from "./shared/ErrorBox";
import InfoRow from "./shared/InfoRow";
import { C, inputStyle, labelStyle } from "./shared";

// ── Tooltip ───────────────────────────────────────────────────────────────────
function CategoryTooltip({ description }: { description: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          background:  "transparent",
          border:      "none",
          padding:     "0 0 0 0.3rem",
          cursor:      "help",
          display:     "inline-flex",
          alignItems:  "center",
          color:       description ? C.primary : C.muted,
          opacity:     description ? 1 : 0.4,
          lineHeight:  1,
        }}
        aria-label="Category description"
      >
        <Info style={{ width: "0.85rem", height: "0.85rem" }} />
      </button>
      {visible && description && (
        <div
          role="tooltip"
          style={{
            position:        "absolute",
            bottom:          "calc(100% + 8px)",
            left:            "50%",
            transform:       "translateX(-50%)",
            backgroundColor: C.tooltip,
            border:          `1px solid ${C.border}`,
            borderRadius:    "0.5rem",
            padding:         "0.6rem 0.75rem",
            width:           "220px",
            zIndex:          100,
            pointerEvents:   "none",
            boxShadow:       "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{
            position:     "absolute",
            bottom:       "-5px",
            left:         "50%",
            transform:    "translateX(-50%) rotate(45deg)",
            width:        "8px",
            height:       "8px",
            background:   C.tooltip,
            borderRight:  `1px solid ${C.border}`,
            borderBottom: `1px solid ${C.border}`,
          }} />
          <p style={{ color: C.fg, fontSize: "0.75rem", lineHeight: "1.45", margin: 0 }}>
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CreateTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [categories,       setCategories]       = useState<CategoryRead[]>([]);
  const [errors,           setErrors]           = useState<string[]>([]);
  const [focusedField,     setFocusedField]     = useState<string | null>(null);
  const [amountInput,      setAmountInput]      = useState("");
  const [form, setForm] = useState<Transaction>({
    amount:           0,
    description:      "",
    category_id:      0,
    transaction_type: "",
    transaction_date: "",
  });

  useEffect(() => {
    if (!form.transaction_type) { setCategories([]); return; }
    const endpoint = form.transaction_type === "Expense"
      ? "api/categories/expense"
      : "api/categories/income";
    api.get<CategoryRead[]>(endpoint).then(res => {
      setCategories(res.data);
      setForm(prev => ({ ...prev, category_id: 0 }));
    });
  }, [form.transaction_type]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "category_id" ? Number(value) : value }));
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*\.?\d*$/.test(value)) return;
    const parts = value.split(".");
    if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);
    setAmountInput(parts.join("."));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleSubmit = () => {
    const updatedForm = { ...form, amount: Number(amountInput) };
    const result = transactionSchema.safeParse(updatedForm);
    if (!result.success) {
      setErrors(result.error.issues.map(i => i.message));
      return;
    }
    setErrors([]);
    setForm(updatedForm);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      if (!user) return;
      if (!token || !tokenType) return alert("Not authorized");
      await api.post("api/transactions/", form, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      alert("Successfully created!");
      setForm({ amount: 0, description: "", category_id: 0, transaction_type: "", transaction_date: "" });
      setAmountInput("");
      setShowConfirmation(false);
      onClose();
    } catch (err: any) {
      console.error(err?.response?.data);
    }
  };

  const selectedCategory = categories.find(c => c.id === form.category_id) ?? null;
  const isIncome = form.transaction_type === "Income";

  // ── Form view ─────────────────────────────────────────────────────────────
  if (!showConfirmation) return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title="Add Transaction"
          subtitle="Fill in the details below"
          onClose={onClose}
        />

        <ErrorBox messages={errors} />

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}></div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Type</label>
            <select
              name="transaction_type"
              value={form.transaction_type}
              onChange={handleChange}
              onFocus={() => setFocusedField("transaction_type")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "transaction_type" ? C.borderFoc : C.border }}
            >
              <option value=""        style={{ background: C.surface }}>Select type…</option>
              <option value="Income"  style={{ background: C.surface }}>Income</option>
              <option value="Expense" style={{ background: C.surface }}>Expense</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Category</span>
              <CategoryTooltip description={selectedCategory?.description ?? ""} />
            </div>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              disabled={!form.transaction_type}
              onFocus={() => setFocusedField("category_id")}
              onBlur={() => setFocusedField(null)}
              style={{
                ...inputStyle,
                borderColor: focusedField === "category_id" ? C.borderFoc : C.border,
                opacity: !form.transaction_type ? 0.45 : 1,
                cursor:  !form.transaction_type ? "not-allowed" : "auto",
              }}
            >
              <option value={0} style={{ background: C.surface }}>Select category…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} style={{ background: C.surface }}>{c.name}</option>
              ))}
            </select>
            {selectedCategory?.description && (
              <p style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: C.fgMuted, lineHeight: "1.4", paddingLeft: "0.1rem" }}>
                {selectedCategory.description}
              </p>
            )}
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
              style={{ ...inputStyle, borderColor: focusedField === "transaction_date" ? C.borderFoc : C.border, colorScheme: "dark" }}
            />
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)",
                color: C.fgMuted, fontSize: "0.875rem", pointerEvents: "none",
              }}>₱</span>
              <input
                type="text"
                value={amountInput}
                onChange={handleAmountChange}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                onFocus={() => setFocusedField("amount")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, paddingLeft: "1.75rem", borderColor: focusedField === "amount" ? C.borderFoc : C.border }}
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
              onKeyDown={handleKeyDown}
              placeholder="Optional note…"
              onFocus={() => setFocusedField("description")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "description" ? C.borderFoc : C.border }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
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
              onClick={handleSubmit}
              style={{
                flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
                border: "none", background: C.primary, color: "#fff",
                fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              }}
            >
              Review <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );

  // ── Confirmation view ─────────────────────────────────────────────────────
  return (
    <Shell>
      <div style={{ padding: "1.75rem" }}>
        <ModalHeader
          title="Confirm Transaction"
          subtitle="Please review before submitting"
          onClose={() => setShowConfirmation(false)}
        />

        {/* Type badge */}
        <div style={{ marginBottom: "1rem" }}></div>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{
            display:         "inline-block",
            padding:         "0.3rem 1rem",
            borderRadius:    "999px",
            fontSize:        "0.8rem",
            fontWeight:      600,
            backgroundColor: isIncome ? "hsl(160 60% 45% / 0.15)" : "hsl(0 72% 51% / 0.15)",
            color:           isIncome ? C.income : C.expense,
            border:          `1px solid ${isIncome ? C.income : C.expense}`,
          }}>
            {form.transaction_type}
          </span>
        </div>

        <InfoRow label="Category"    value={selectedCategory?.name ?? "—"} />
        <InfoRow label="Date"        value={form.transaction_date || "—"} />
        <InfoRow label="Amount"      value={`₱${Number(form.amount).toLocaleString()}`} />
        <InfoRow label="Description" value={form.description || "—"} />

        {selectedCategory?.description && (
          <p style={{
            marginTop: "0.75rem", fontSize: "0.72rem", color: C.fgMuted,
            backgroundColor: C.surfaceEl, border: `1px solid ${C.border}`,
            borderRadius: "0.5rem", padding: "0.5rem 0.75rem", lineHeight: "1.45",
          }}>
            <Info style={{ width: "0.7rem", height: "0.7rem", display: "inline", marginRight: "0.3rem", verticalAlign: "middle" }} />
            {selectedCategory.description}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
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
            onClick={handleConfirm}
            style={{
              flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
              border: "none", background: C.income, color: "#fff",
              fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </Shell>
  );
}