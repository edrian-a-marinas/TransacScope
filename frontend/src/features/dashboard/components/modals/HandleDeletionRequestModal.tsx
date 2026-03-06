import { useState, useEffect, useRef } from "react";
import {
  X, Trash2, ArrowLeft, CheckCircle2, XCircle,
  AlertTriangle, Clock, Receipt, ChevronRight,
} from "lucide-react";
import api from "../../../../services/apiClient";
import type { OnCloseProps } from "../../lib/utility";
import type { TransactionInfo, DeletionRequest } from "../../schemas/user";
import { formatCurrency } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  overlay:    "rgba(0,0,0,0.55)",
};

type Step = "list" | "detail" | "confirmApprove" | "confirmReject";

const td: React.CSSProperties = {
  padding:      "0.6rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── HOISTED components ────────────────────────────────────────────────────────
function Shell({ children, onBackdropDown, onBackdropUp, narrow = false }: {
  children: React.ReactNode;
  onBackdropDown: React.MouseEventHandler;
  onBackdropUp:   React.MouseEventHandler;
  narrow?:        boolean;
}) {
  return (
    <div onMouseDown={onBackdropDown} onMouseUp={onBackdropUp} style={{
      position: "fixed", inset: 0,
      backgroundColor: C.overlay,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 50, padding: "1rem",
    }}>
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: "1rem", width: "100%",
          maxWidth: narrow ? "500px" : "1100px",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh", overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, icon: Icon, iconColor, onClose, onBack }: {
  title:      string;
  subtitle?:  string;
  icon?:      typeof X;
  iconColor?: string;
  onClose:    () => void;
  onBack?:    () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {onBack && (
          <button onClick={onBack} style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: "0.4rem", color: C.fgMuted, cursor: "pointer",
            padding: "0.25rem 0.5rem", display: "flex", alignItems: "center",
            gap: "0.25rem", fontSize: "0.75rem",
          }}>
            <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {Icon && <Icon style={{ width: "1rem", height: "1rem", color: iconColor ?? C.fg }} />}
          <div>
            <h2 style={{ color: C.fg, fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ color: C.fgMuted, fontSize: "0.72rem", margin: "0.1rem 0 0" }}>{subtitle}</p>}
          </div>
        </div>
      </div>
      <button onClick={onClose} style={{
        background: "transparent", border: `1px solid ${C.border}`,
        borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer",
        padding: "0.3rem", display: "flex", alignItems: "center",
      }}>
        <X style={{ width: "1rem", height: "1rem" }} />
      </button>
    </div>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.5rem",
      padding: "0.55rem 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{
        fontSize: "0.72rem", fontWeight: 600, color: C.fgMuted,
        textTransform: "uppercase", letterSpacing: "0.05em",
        minWidth: "140px", paddingTop: "0.05rem",
      }}>{label}</span>
      <span style={{ fontSize: "0.82rem", color: accent ?? C.fg }}>{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "0.65rem", fontWeight: 700, color: C.fgMuted,
      textTransform: "uppercase", letterSpacing: "0.08em",
      margin: "1rem 0 0.2rem",
    }}>{children}</p>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isIncome = type !== "Expense";
  return (
    <span style={{
      display: "inline-block", padding: "0.12rem 0.5rem",
      borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700,
      backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
      color: isIncome ? C.income : C.expense,
      border: `1px solid ${isIncome ? C.income : C.expense}40`,
    }}>{type}</span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HandleDeletionRequestModal({ onClose }: OnCloseProps) {
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [requests,        setRequests]        = useState<DeletionRequest[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [step,            setStep]            = useState<Step>("list");
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [transactionInfo, setTransactionInfo] = useState<TransactionInfo | null>(null);
  const [loadingTx,       setLoadingTx]       = useState(false);
  const [hoveredRow,      setHoveredRow]      = useState<number | null>(null);
  const [countdown,       setCountdown]       = useState(5);
  const [canApprove,      setCanApprove]      = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  // Kick off 5s countdown whenever confirmApprove step starts
  useEffect(() => {
    if (step === "confirmApprove") {
      setCountdown(5);
      setCanApprove(false);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            setCanApprove(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step]);

  const fetchRequests = async () => {
    if (!token || !tokenType) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("api/transactions/deletion-requests", {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load deletion requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransaction = async (transactionId: number) => {
    if (!token || !tokenType) return null;
    try {
      const res = await api.get(`api/transactions/${transactionId}`, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      return res.data;
    } catch { return null; }
  };

  const handleRowClick = async (req: DeletionRequest) => {
    if (req.status !== "pending") return;
    setSelectedRequest(req);
    setLoadingTx(true);
    const txInfo = await fetchTransaction(req.transaction_id);
    setLoadingTx(false);
    if (txInfo) {
      setTransactionInfo(txInfo);
      setStep("detail");
    } else {
      setError("Failed to fetch transaction details.");
    }
  };

  const handleFinalApprove = async () => {
    if (!selectedRequest) return;
    try {
      await api.patch(
        `/api/transactions/deletion-requests/${selectedRequest.id}`,
        { approve: true },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      alert("Transaction deleted successfully.");
      onClose();
    } catch { setError("Failed to delete transaction."); }
  };

  const handleFinalReject = async () => {
    if (!selectedRequest) return;
    try {
      await api.patch(
        `/api/transactions/deletion-requests/${selectedRequest.id}`,
        { approve: false },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      alert("Deletion request rejected.");
      onClose();
    } catch { setError("Failed to reject request."); }
  };

  const formatSignedAmount = (amount: number, type?: string) => {
    const formatted = formatCurrency(amount).replace("₱ ", "");
    return type === "Expense" ? `-₱${formatted}` : `+₱${formatted}`;
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  // Shared detail body used in steps 2, 3, 4
  const TxDetailBlock = () => {
    if (!selectedRequest || !transactionInfo) return null;
    const isIncome = transactionInfo.transaction_type !== "Expense";
    return (
      <>
        <SectionLabel>Request Info</SectionLabel>
        <DetailRow
          label="Requested By"
          value={selectedRequest.requester
            ? `${selectedRequest.requester.first_name} ${selectedRequest.requester.last_name}`
            : `User #${selectedRequest.requested_by}`}
        />
        <DetailRow label="Reason" value="—" accent={C.fgMuted} />

        <SectionLabel>Transaction Details</SectionLabel>
        <DetailRow label="Transaction ID" value={transactionInfo.id} />
        <DetailRow label="Type" value={<TypeBadge type={transactionInfo.transaction_type} />} />
        <DetailRow
          label="Amount"
          value={formatSignedAmount(transactionInfo.amount, transactionInfo.transaction_type)}
          accent={isIncome ? C.income : C.expense}
        />
        <DetailRow label="Category"    value={transactionInfo.category_name} />
        <DetailRow label="Date"        value={transactionInfo.transaction_date} accent={C.fgMuted} />
        <DetailRow label="Description" value={transactionInfo.description || "—"} accent={C.fgMuted} />
      </>
    );
  };

  // ── STEP: LIST ────────────────────────────────────────────────────────────
  if (step === "list") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      <ModalHeader
        title="Deletion Requests"
        subtitle={loading ? "Loading…" : `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""}`}
        icon={Trash2} iconColor={C.expense}
        onClose={onClose}
      />

      {!loading && requests.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            { label: "Pending", value: pendingCount,    color: C.expense },
            { label: "Total",   value: requests.length, color: C.fgMuted },
          ].map(p => (
            <div key={p.label} style={{
              background: `${p.color}18`, border: `1px solid ${p.color}40`,
              borderRadius: "0.4rem", padding: "0.3rem 0.75rem", fontSize: "0.75rem",
            }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
        {loading && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>}

        {error && (
          <div style={{ margin: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "hsl(0 72% 51% / 0.08)", border: `1px solid ${C.expense}40`, borderRadius: "0.5rem", padding: "0.6rem 0.75rem" }}>
            <AlertTriangle style={{ width: "0.85rem", height: "0.85rem", color: C.expense, flexShrink: 0 }} />
            <p style={{ color: "hsl(0,72%,70%)", fontSize: "0.78rem", margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <CheckCircle2 style={{ width: "2rem", height: "2rem", color: C.income, margin: "0 auto 0.75rem" }} />
            <p style={{ color: C.fgMuted, fontSize: "0.85rem", margin: 0 }}>No pending deletion requests.</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "7%"  }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "6%"  }} />
            </colgroup>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                {["Tx ID", "Type", "Amount", "Requested By", "Status", "Requested At", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 600,
                    color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: `1px solid ${C.border}`, background: C.surfaceEl,
                    textAlign: "left", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => {
                const isEven    = idx % 2 === 0;
                const hovered   = hoveredRow === idx;
                const isPending = req.status === "pending";
                const isIncome  = req.transaction?.transaction_type !== "Expense";
                const amtColor  = isIncome ? C.income : C.expense;

                return (
                  <tr
                    key={req.id}
                    onClick={() => isPending && handleRowClick(req)}
                    style={{
                      backgroundColor: hovered && isPending ? C.surfaceHov : isEven ? "transparent" : "hsl(220,14%,14%)",
                      transition: "background-color 0.1s",
                      cursor: isPending ? (loadingTx ? "wait" : "pointer") : "default",
                    }}
                    onMouseEnter={() => setHoveredRow(idx)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={td}>{req.transaction_id}</td>
                    <td style={td}>{req.transaction ? <TypeBadge type={req.transaction.transaction_type} /> : "—"}</td>
                    <td style={{ ...td, color: amtColor, fontWeight: 600 }}>
                      {req.transaction ? formatSignedAmount(req.transaction.amount, req.transaction.transaction_type) : "—"}
                    </td>
                    <td style={td}>
                      {req.requester ? `${req.requester.first_name} ${req.requester.last_name}` : `User #${req.requested_by}`}
                    </td>
                    <td style={td}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.25rem",
                        padding: "0.12rem 0.5rem", borderRadius: "999px",
                        fontSize: "0.68rem", fontWeight: 600,
                        backgroundColor: isPending ? "hsl(45 85% 50% / 0.12)" : "hsl(220 10% 46% / 0.12)",
                        color: isPending ? C.warning : C.fgMuted,
                        border: `1px solid ${isPending ? C.warning : C.fgMuted}40`,
                      }}>
                        {isPending && <Clock style={{ width: "0.6rem", height: "0.6rem" }} />}
                        {req.status}
                      </span>
                    </td>
                    <td style={{ ...td, color: C.fgMuted }}>{new Date(req.requested_at).toLocaleString()}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {isPending && (
                        <ChevronRight style={{
                          width: "0.85rem", height: "0.85rem",
                          color: hovered ? C.primary : C.border,
                          transition: "color 0.15s",
                        }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && requests.length > 0 && (
        <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.fgMuted, flexShrink: 0 }}>
          {pendingCount > 0 ? "Click a pending row to review and take action" : "No pending actions"}
        </div>
      )}
    </Shell>
  );

  // ── STEP: DETAIL ──────────────────────────────────────────────────────────
  if (step === "detail") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp} narrow>
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.expense}, ${C.expense}44)` }} />
      <ModalHeader
        title="Review Request"
        subtitle="Decide whether to approve or reject"
        icon={Receipt} iconColor={C.expense}
        onClose={onClose} onBack={() => setStep("list")}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "0.75rem 1.5rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "hsl(0 72% 51% / 0.08)", border: `1px solid ${C.expense}40`, borderRadius: "0.5rem", padding: "0.65rem 0.85rem", marginBottom: "0.25rem" }}>
          <AlertTriangle style={{ width: "0.9rem", height: "0.9rem", color: C.expense, flexShrink: 0, marginTop: "0.1rem" }} />
          <p style={{ color: "hsl(0,72%,70%)", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
            Approving will <strong>permanently delete</strong> this transaction. This cannot be undone.
          </p>
        </div>
        <TxDetailBlock />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setStep("list")} style={{ flex: 1, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
          <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
        </button>
        <button
          onClick={() => setStep("confirmReject")}
          style={{ flex: 1, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.fgMuted}50`, background: "transparent", color: C.fgMuted, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "border-color 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.expense; e.currentTarget.style.color = C.expense; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.fgMuted}50`; e.currentTarget.style.color = C.fgMuted; }}
        >
          <XCircle style={{ width: "0.85rem", height: "0.85rem" }} /> Reject
        </button>
        <button
          onClick={() => setStep("confirmApprove")}
          style={{ flex: 2, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.expense}80`, background: "hsl(0 72% 51% / 0.15)", color: C.expense, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "opacity 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <Trash2 style={{ width: "0.85rem", height: "0.85rem" }} /> Approve Deletion
        </button>
      </div>
    </Shell>
  );

  // ── STEP: CONFIRM APPROVE (5s countdown) ─────────────────────────────────
  if (step === "confirmApprove") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp} narrow>
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.expense}, ${C.expense}44)` }} />
      <ModalHeader
        title="Confirm Deletion"
        subtitle="This action is irreversible"
        icon={Trash2} iconColor={C.expense}
        onClose={onClose} onBack={() => setStep("detail")}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "0.75rem 1.5rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "hsl(0 72% 51% / 0.08)", border: `1px solid ${C.expense}40`, borderRadius: "0.5rem", padding: "0.65rem 0.85rem", marginBottom: "0.25rem" }}>
          <AlertTriangle style={{ width: "0.9rem", height: "0.9rem", color: C.expense, flexShrink: 0, marginTop: "0.1rem" }} />
          <p style={{ color: "hsl(0,72%,70%)", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
            Please review carefully. The confirm button will unlock in{" "}
            <strong style={{ color: canApprove ? C.income : C.warning }}>
              {canApprove ? "now" : `${countdown}s`}
            </strong>.
          </p>
        </div>
        <TxDetailBlock />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setStep("detail")} style={{ flex: 1, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
          <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
        </button>

        {/* Countdown button with progress fill */}
        <button
          onClick={canApprove ? handleFinalApprove : undefined}
          disabled={!canApprove}
          style={{
            flex: 2, padding: "0.55rem", borderRadius: "0.5rem",
            border: canApprove ? `1px solid ${C.expense}80` : `1px solid ${C.border}`,
            background: canApprove ? "hsl(0 72% 51% / 0.15)" : C.surfaceEl,
            color: canApprove ? C.expense : C.fgMuted,
            fontSize: "0.82rem", fontWeight: 700,
            cursor: canApprove ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            transition: "all 0.3s", position: "relative", overflow: "hidden",
          }}
        >
          {/* Progress bar fill */}
          {!canApprove && (
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${((5 - countdown) / 5) * 100}%`,
              background: "hsl(0 72% 51% / 0.15)",
              transition: "width 1s linear",
            }} />
          )}
          <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {canApprove
              ? <><Trash2 style={{ width: "0.85rem", height: "0.85rem" }} /> Confirm Delete</>
              : <><Clock  style={{ width: "0.85rem", height: "0.85rem" }} /> Wait {countdown}s…</>
            }
          </span>
        </button>
      </div>
    </Shell>
  );

  // ── STEP: CONFIRM REJECT ──────────────────────────────────────────────────
  if (step === "confirmReject") return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp} narrow>
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.fgMuted}, ${C.fgMuted}44)` }} />
      <ModalHeader
        title="Confirm Rejection"
        subtitle="The deletion request will be declined"
        icon={XCircle} iconColor={C.fgMuted}
        onClose={onClose} onBack={() => setStep("detail")}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "0.75rem 1.5rem 1.25rem" }}>
        <TxDetailBlock />
      </div>
      <div style={{ display: "flex", gap: "0.75rem", padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setStep("detail")} style={{ flex: 1, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
          <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
        </button>
        <button
          onClick={handleFinalReject}
          style={{ flex: 2, padding: "0.55rem", borderRadius: "0.5rem", border: `1px solid ${C.fgMuted}60`, background: "hsl(220 10% 46% / 0.12)", color: C.fg, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", transition: "opacity 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
        >
          <XCircle style={{ width: "0.85rem", height: "0.85rem" }} /> Confirm Rejection
        </button>
      </div>
    </Shell>
  );

  return null;
}