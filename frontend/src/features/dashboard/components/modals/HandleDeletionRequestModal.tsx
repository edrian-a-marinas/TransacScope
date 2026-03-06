import { useState, useEffect } from "react";
import { X, Trash2, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, Receipt } from "lucide-react";
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

const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ children, onBackdropDown, onBackdropUp, wide = true }: {
  children:       React.ReactNode;
  onBackdropDown: React.MouseEventHandler;
  onBackdropUp:   React.MouseEventHandler;
  wide?:          boolean;
}) {
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
          background:    C.surface,
          border:        `1px solid ${C.border}`,
          borderRadius:  "1rem",
          width:         "100%",
          maxWidth:      wide ? "1100px" : "480px",
          display:       "flex",
          flexDirection: "column",
          maxHeight:     "90vh",
          boxShadow:     "0 24px 48px rgba(0,0,0,0.5)",
          overflow:      "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Detail row (for confirm view) ─────────────────────────────────────────────
function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "flex-start",
      gap:          "0.5rem",
      padding:      "0.6rem 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{
        fontSize:      "0.72rem",
        fontWeight:    600,
        color:         C.fgMuted,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        minWidth:      "130px",
        paddingTop:    "0.05rem",
      }}>
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: accent ?? C.fg }}>
        {value}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize:      "0.68rem",
      fontWeight:    700,
      color:         C.fgMuted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      margin:        "1.1rem 0 0.15rem",
    }}>
      {children}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HandleDeletionRequestModal({ onClose }: OnCloseProps) {
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [requests,         setRequests]         = useState<DeletionRequest[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [selectedRequest,  setSelectedRequest]  = useState<DeletionRequest | null>(null);
  const [transactionInfo,  setTransactionInfo]  = useState<TransactionInfo | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loadingTx,        setLoadingTx]        = useState(false);
  const [hoveredRow,       setHoveredRow]       = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch only pending deletion requests
  const fetchRequests = async () => {
    if (!token || !tokenType) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("api/transactions/deletion-requests", {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      if (Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load deletion requests.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transaction details on demand
  const fetchTransaction = async (transactionId: number) => {
    if (!token || !tokenType) return null;
    try {
      const res = await api.get(`api/transactions/${transactionId}`, {
        headers: { Authorization: `${tokenType} ${token}` },
      });
      return res.data;
    } catch {
      return null;
    }
  };

  const handleApproveClick = async (req: DeletionRequest) => {
    setSelectedRequest(req);
    setLoadingTx(true);
    const txInfo = await fetchTransaction(req.transaction_id);
    setLoadingTx(false);
    if (txInfo) {
      setTransactionInfo(txInfo);
      setShowConfirmModal(true);
    } else {
      setError("Failed to fetch transaction details.");
    }
  };

  const handleFinalApprove = async () => {
    if (!selectedRequest || !transactionInfo) return;
    try {
      await api.patch(
        `/api/transactions/deletion-requests/${selectedRequest.id}`,
        { approve: true },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      setShowConfirmModal(false);
      setSelectedRequest(null);
      setTransactionInfo(null);
      alert("Deleted a transaction.");
      onClose();
    } catch {
      setError("Failed to delete transaction.");
    }
  };

  const handleRejectClick = async (req: DeletionRequest) => {
    if (!token || !tokenType) return;
    try {
      await api.patch(
        `/api/transactions/deletion-requests/${req.id}`,
        { approve: false },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      alert("Rejected to delete a transaction.");
      onClose();
    } catch {
      setError("Failed to reject request.");
    }
  };

  // Helper for + / - formatting
  const formatSignedAmount = (amount: number, type?: string) => {
    const formatted = formatCurrency(amount).replace("₱ ", "");
    return type === "Expense" ? `₱ -${formatted}` : `₱ +${formatted}`;
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <>
      {/* ── Pending Requests List ──────────────────────────────────────────── */}
      {!showConfirmModal && (
        <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

          {/* Header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "1.25rem 1.5rem",
            borderBottom:   `1px solid ${C.border}`,
            flexShrink:     0,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Trash2 style={{ width: "1rem", height: "1rem", color: C.expense }} />
                <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
                  Deletion Requests
                </h2>
              </div>
              <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
                {loading ? "Loading…" : `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""}`}
              </p>
            </div>
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

          {/* Summary pill */}
          {!loading && requests.length > 0 && (
            <div style={{
              display:      "flex",
              gap:          "0.75rem",
              padding:      "0.75rem 1.5rem",
              borderBottom: `1px solid ${C.border}`,
              flexShrink:   0,
            }}>
              <div style={{
                background:   `${C.expense}18`,
                border:       `1px solid ${C.expense}40`,
                borderRadius: "0.4rem",
                padding:      "0.3rem 0.75rem",
                fontSize:     "0.75rem",
              }}>
                <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>Pending</span>
                <span style={{ color: C.expense, fontWeight: 700 }}>{pendingCount}</span>
              </div>
              <div style={{
                background:   `${C.fgMuted}12`,
                border:       `1px solid ${C.border}`,
                borderRadius: "0.4rem",
                padding:      "0.3rem 0.75rem",
                fontSize:     "0.75rem",
              }}>
                <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>Total</span>
                <span style={{ color: C.fg, fontWeight: 700 }}>{requests.length}</span>
              </div>
            </div>
          )}

          {/* Body */}
          <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>

            {loading && (
              <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>
            )}

            {error && (
              <div style={{
                margin:       "1rem 1.5rem",
                display:      "flex",
                alignItems:   "center",
                gap:          "0.5rem",
                background:   "hsl(0 72% 51% / 0.08)",
                border:       `1px solid ${C.expense}40`,
                borderRadius: "0.5rem",
                padding:      "0.6rem 0.75rem",
              }}>
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
                  <col style={{ width: "8%"  }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr>
                    {["Tx ID", "Type", "Amount", "Requested By", "Status", "Requested At", "Actions"].map(h => (
                      <th key={h} style={{
                        padding:       "0.6rem 0.75rem",
                        fontSize:      "0.7rem",
                        fontWeight:    600,
                        color:         C.fgMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom:  `1px solid ${C.border}`,
                        background:    C.surfaceEl,
                        textAlign:     "left",
                        whiteSpace:    "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req, idx) => {
                    const isEven   = idx % 2 === 0;
                    const hovered  = hoveredRow === idx;
                    const isIncome = req.transaction?.transaction_type !== "Expense";
                    const amtColor = isIncome ? C.income : C.expense;

                    return (
                      <tr
                        key={req.id}
                        style={{
                          backgroundColor: hovered
                            ? C.surfaceHov
                            : isEven ? "transparent" : "hsl(220,14%,14%)",
                          transition: "background-color 0.1s",
                        }}
                        onMouseEnter={() => setHoveredRow(idx)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <td style={td}>{req.transaction_id}</td>

                        {/* Type badge */}
                        <td style={td}>
                          {req.transaction ? (
                            <span style={{
                              display:         "inline-block",
                              padding:         "0.12rem 0.5rem",
                              borderRadius:    "999px",
                              fontSize:        "0.68rem",
                              fontWeight:      700,
                              backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
                              color:           amtColor,
                              border:          `1px solid ${amtColor}40`,
                            }}>
                              {req.transaction.transaction_type}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Amount */}
                        <td style={{ ...td, color: amtColor, fontWeight: 600 }}>
                          {req.transaction
                            ? formatSignedAmount(req.transaction.amount, req.transaction.transaction_type)
                            : "—"}
                        </td>

                        {/* Requested by */}
                        <td style={td}>
                          {req.requester
                            ? `${req.requester.first_name} ${req.requester.last_name}`
                            : `User #${req.requested_by}`}
                        </td>

                        {/* Status badge */}
                        <td style={td}>
                          <span style={{
                            display:         "inline-flex",
                            alignItems:      "center",
                            gap:             "0.25rem",
                            padding:         "0.12rem 0.5rem",
                            borderRadius:    "999px",
                            fontSize:        "0.68rem",
                            fontWeight:      600,
                            backgroundColor: req.status === "pending"
                              ? "hsl(45 85% 50% / 0.12)"
                              : "hsl(220 10% 46% / 0.12)",
                            color:           req.status === "pending" ? C.warning : C.fgMuted,
                            border:          `1px solid ${req.status === "pending" ? C.warning : C.fgMuted}40`,
                          }}>
                            {req.status === "pending" && (
                              <Clock style={{ width: "0.6rem", height: "0.6rem" }} />
                            )}
                            {req.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ ...td, color: C.fgMuted }}>
                          {new Date(req.requested_at).toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td style={td}>
                          {req.status === "pending" && (
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                disabled={loadingTx}
                                onClick={() => handleApproveClick(req)}
                                style={{
                                  display:      "flex",
                                  alignItems:   "center",
                                  gap:          "0.25rem",
                                  padding:      "0.2rem 0.55rem",
                                  borderRadius: "0.4rem",
                                  fontSize:     "0.7rem",
                                  fontWeight:   600,
                                  cursor:       loadingTx ? "not-allowed" : "pointer",
                                  border:       `1px solid ${C.income}50`,
                                  background:   "hsl(160 60% 45% / 0.1)",
                                  color:        loadingTx ? C.fgMuted : C.income,
                                  transition:   "opacity 0.15s",
                                  opacity:      loadingTx ? 0.5 : 1,
                                }}
                                onMouseEnter={e => !loadingTx && ((e.currentTarget as HTMLButtonElement).style.opacity = "0.75")}
                                onMouseLeave={e => !loadingTx && ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
                              >
                                <CheckCircle2 style={{ width: "0.65rem", height: "0.65rem" }} />
                                {loadingTx ? "Loading…" : "Approve"}
                              </button>
                              <button
                                onClick={() => handleRejectClick(req)}
                                style={{
                                  display:      "flex",
                                  alignItems:   "center",
                                  gap:          "0.25rem",
                                  padding:      "0.2rem 0.55rem",
                                  borderRadius: "0.4rem",
                                  fontSize:     "0.7rem",
                                  fontWeight:   600,
                                  cursor:       "pointer",
                                  border:       `1px solid ${C.expense}50`,
                                  background:   "hsl(0 72% 51% / 0.1)",
                                  color:        C.expense,
                                  transition:   "opacity 0.15s",
                                }}
                                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.75")}
                                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
                              >
                                <XCircle style={{ width: "0.65rem", height: "0.65rem" }} />
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {!loading && requests.length > 0 && (
            <div style={{
              padding:    "0.6rem 1.5rem",
              borderTop:  `1px solid ${C.border}`,
              fontSize:   "0.72rem",
              color:      C.fgMuted,
              flexShrink: 0,
            }}>
              Showing {requests.length} request{requests.length !== 1 ? "s" : ""}
              {requests.length > 15 ? " · scroll to see more" : ""}
            </div>
          )}
        </Shell>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {showConfirmModal && selectedRequest && transactionInfo && (
        <Shell
          onBackdropDown={() => {}}
          onBackdropUp={() => {}}
          wide={false}
        >
          {/* Top accent bar */}
          <div style={{ height: "3px", background: `linear-gradient(90deg, ${C.expense}, ${C.expense}44)` }} />

          {/* Header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "1.25rem 1.5rem",
            borderBottom:   `1px solid ${C.border}`,
            flexShrink:     0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Receipt style={{ width: "1rem", height: "1rem", color: C.expense }} />
              <h2 style={{ color: C.fg, fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                Confirm Deletion
              </h2>
            </div>
            <button
              onClick={() => setShowConfirmModal(false)}
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

          {/* Body */}
          <div style={{ overflowY: "auto", flex: 1, padding: "1.25rem 1.5rem" }}>

            {/* Warning banner */}
            <div style={{
              display:      "flex",
              alignItems:   "flex-start",
              gap:          "0.5rem",
              background:   "hsl(0 72% 51% / 0.08)",
              border:       `1px solid ${C.expense}40`,
              borderRadius: "0.5rem",
              padding:      "0.65rem 0.85rem",
              marginBottom: "0.25rem",
            }}>
              <AlertTriangle style={{ width: "0.9rem", height: "0.9rem", color: C.expense, flexShrink: 0, marginTop: "0.1rem" }} />
              <p style={{ color: "hsl(0,72%,70%)", fontSize: "0.75rem", margin: 0, lineHeight: 1.5 }}>
                This action will permanently delete the transaction. Please review the details carefully before approving.
              </p>
            </div>

            {/* Request info */}
            <SectionHeading>Request Info</SectionHeading>
            <DetailRow
              label="Requested By"
              value={
                selectedRequest.requester
                  ? `${selectedRequest.requester.first_name} ${selectedRequest.requester.last_name}`
                  : `User #${selectedRequest.requested_by}`
              }
            />
            <DetailRow label="Reason" value="NULL for now DONT DELETE" accent={C.fgMuted} />

            {/* Transaction info */}
            <SectionHeading>Transaction Details</SectionHeading>
            <DetailRow label="Transaction ID" value={transactionInfo.id} />
            <DetailRow
              label="Type"
              value={
                <span style={{
                  display:         "inline-block",
                  padding:         "0.12rem 0.5rem",
                  borderRadius:    "999px",
                  fontSize:        "0.68rem",
                  fontWeight:      700,
                  backgroundColor: transactionInfo.transaction_type !== "Expense"
                    ? "hsl(160 60% 45% / 0.12)"
                    : "hsl(0 72% 51% / 0.12)",
                  color:           transactionInfo.transaction_type !== "Expense" ? C.income : C.expense,
                  border:          `1px solid ${transactionInfo.transaction_type !== "Expense" ? C.income : C.expense}40`,
                }}>
                  {transactionInfo.transaction_type}
                </span>
              }
            />
            <DetailRow
              label="Amount"
              value={formatSignedAmount(transactionInfo.amount, transactionInfo.transaction_type)}
              accent={transactionInfo.transaction_type !== "Expense" ? C.income : C.expense}
            />
            <DetailRow label="Category"    value={transactionInfo.category_name} />
            <DetailRow label="Date"        value={transactionInfo.transaction_date} accent={C.fgMuted} />
            <DetailRow label="Description" value={transactionInfo.description || "—"} accent={C.fgMuted} />
          </div>

          {/* Footer actions */}
          <div style={{
            display:        "flex",
            gap:            "0.75rem",
            justifyContent: "flex-end",
            padding:        "1rem 1.5rem",
            borderTop:      `1px solid ${C.border}`,
            flexShrink:     0,
          }}>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "0.35rem",
                padding:      "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize:     "0.8rem",
                fontWeight:   600,
                background:   C.surfaceEl,
                border:       `1px solid ${C.border}`,
                color:        C.fgMuted,
                cursor:       "pointer",
                transition:   "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
                (e.currentTarget as HTMLButtonElement).style.color = C.fg;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.color = C.fgMuted;
              }}
            >
              <ArrowLeft style={{ width: "0.75rem", height: "0.75rem" }} />
              Go Back
            </button>

            <button
              onClick={handleFinalApprove}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "0.4rem",
                padding:      "0.5rem 1.1rem",
                borderRadius: "0.5rem",
                fontSize:     "0.8rem",
                fontWeight:   600,
                background:   "hsl(0 72% 51% / 0.15)",
                border:       `1px solid ${C.expense}80`,
                color:        C.expense,
                cursor:       "pointer",
                transition:   "opacity 0.15s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.8")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
            >
              <Trash2 style={{ width: "0.8rem", height: "0.8rem" }} />
              Approve Deletion
            </button>
          </div>
        </Shell>
      )}
    </>
  );
}