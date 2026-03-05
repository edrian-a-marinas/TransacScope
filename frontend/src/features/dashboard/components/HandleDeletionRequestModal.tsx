import { useState, useEffect } from "react";
import api from "../../../services/apiClient";
import type { OnCloseProps } from "../../../../utility";
import type { TransactionInfo, DeletionRequest } from "../schemas/user";
import { formatCurrency } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";

export default function HandleDeletionRequestModal({ onClose }: OnCloseProps) {
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [transactionInfo, setTransactionInfo] = useState<TransactionInfo | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loadingTx, setLoadingTx] = useState(false);

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
        {
          headers: {
            Authorization: `${tokenType} ${token}`,
          },
        }
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
        {
          headers: {
            Authorization: `${tokenType} ${token}`,
          },
        }
      );

      alert("Rejected to delete a transaction.");
      onClose();
    } catch {
      setError("Failed to reject request.");
    }
  };

  // 🔹 Helper for + / - formatting
  const formatSignedAmount = (amount: number, type?: string) => {
    const formatted = formatCurrency(amount).replace("₱ ", "");
    return type === "Expense" ? `₱ -${formatted}` : `₱ +${formatted}`;
  };

  return (
    <>
      {/* Pending Requests List */}
      {!showConfirmModal && (
        <div onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} style={overlayStyle}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} style={closeBtnStyle}>×</button>
            <h2 style={{ textAlign: "center" }}>Pending Deletion Requests</h2>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {!loading && requests.length === 0 && <p>No pending requests.</p>}

            {!loading && requests.length > 0 && (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Transaction ID</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Requested By</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Requested At</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td style={tdStyle}>{req.transaction_id}</td>
                      <td style={tdStyle}>{req.transaction?.transaction_type || "-"}</td>
                      <td style={tdStyle}>
                        {req.transaction
                          ? formatSignedAmount(req.transaction.amount, req.transaction.transaction_type)
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        {req.requester
                          ? `${req.requester.first_name} ${req.requester.last_name}`
                          : `User ID: ${req.requested_by}`}
                      </td>
                      <td style={tdStyle}>{req.status}</td>
                      <td style={tdStyle}>{new Date(req.requested_at).toLocaleString()}</td>
                      <td style={tdStyle}>
                        {req.status === "pending" && (
                          <>
                            <button disabled={loadingTx} onClick={() => handleApproveClick(req)}>
                              {loadingTx ? "Loading..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleRejectClick(req)}
                              style={{ marginLeft: "0.5rem" }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedRequest && transactionInfo && (
        <div onClick={() => setShowConfirmModal(false)} style={overlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <button onClick={() => setShowConfirmModal(false)} style={closeBtnStyle}>×</button>
            <h2 style={{ textAlign: "center" }}>Transaction Details to Delete</h2>

            <p>
              <strong>Requested By:</strong>{" "}
              {selectedRequest.requester
                ? `${selectedRequest.requester.first_name} ${selectedRequest.requester.last_name}`
                : `User ID: ${selectedRequest.requested_by}`}
            </p>
            <p><strong>Reason:</strong> (NULL for now DONT DELETE)</p>

            <hr style={{ borderColor: "#555" }} />

            <p><strong>Transaction ID:</strong> {transactionInfo.id}</p>
            <p><strong>Type:</strong> {transactionInfo.transaction_type}</p>
            <p>
              <strong>Amount:</strong>{" "}
              {formatSignedAmount(transactionInfo.amount, transactionInfo.transaction_type)}
            </p>
            <p><strong>Category:</strong> {transactionInfo.category_name}</p>
            <p><strong>Date:</strong> {transactionInfo.transaction_date}</p>
            <p><strong>Description:</strong> {transactionInfo.description}</p>

            <div style={buttonRowStyle}>
              <button onClick={() => setShowConfirmModal(false)}>Go Back</button>
              <button onClick={handleFinalApprove}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Styles */
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle: React.CSSProperties = {
  background: "#1c1414",
  padding: "1.5rem",
  borderRadius: "8px",
  minWidth: "500px",
  maxHeight: "80vh",
  overflow: "auto",
  position: "relative",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "1rem",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "12px",
  background: "transparent",
  border: "none",
  color: "#aaa",
  fontSize: "22px",
  cursor: "pointer",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  justifyContent: "flex-end",
  marginTop: "0.5rem",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  backgroundColor: "#333",
  color: "#fff",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "4px 8px",
  color: "#eee",
};