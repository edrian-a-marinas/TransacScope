import { X } from "lucide-react";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import type { ReadTransaction } from "@/features/dashboard/schemas/transaction";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import { C } from "./shared";

interface TransactionDetailModalProps {
  transaction:     ReadTransaction;
  getCategoryName: (id: number | null) => string;
  onClose:         () => void;
}

function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.65rem 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em", minWidth: "130px", paddingTop: "0.05rem" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: accent ?? C.fg, fontWeight: accent ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

export default function TransactionDetailModal({ transaction: tx, getCategoryName, onClose }: TransactionDetailModalProps) {
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const isIncome    = tx.transaction_type === "Income";
  const amountColor = isIncome ? C.income : C.expense;
  const amountLabel = isIncome
    ? `+₱${formatCurrency(tx.amount).replace("₱ ", "")}`
    : `-₱${formatCurrency(tx.amount).replace("₱ ", "")}`;

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0.875rem", width: "100%", maxWidth: "420px", boxShadow: "0 24px 48px rgba(0,0,0,0.55)", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Transaction Detail</h2>
            <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>ID #{tx.id}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer", padding: "0.3rem", display: "flex", alignItems: "center" }}>
            <X style={{ width: "1rem", height: "1rem" }} />
          </button>
        </div>

        {/* Amount hero */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ color: amountColor, fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.35rem", letterSpacing: "-0.01em" }}>{amountLabel}</p>
          <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600, backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)", color: amountColor, border: `1px solid ${amountColor}40` }}>
            {tx.transaction_type}
          </span>
        </div>

        {/* Details */}
        <div style={{ padding: "0.25rem 1.5rem 1.5rem" }}>
          <DetailRow label="Category"    value={getCategoryName(tx.category_id)} />
          <DetailRow label="Description" value={tx.description || "—"} accent={tx.description ? undefined : C.fgMuted} />
          <DetailRow label="Date"        value={tx.transaction_date} />
          <DetailRow label="Created At"  value={formatDate(tx.created_at)} accent={C.fgMuted} />
          <DetailRow label="User ID"     value={tx.user_id} accent={C.fgMuted} />
        </div>
      </div>
    </div>
  );
}