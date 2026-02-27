import { useState, useContext } from "react";
import type { KeyboardEvent } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { Transaction, Category } from "../schemas/transaction";
import type { OnCloseProps } from "../../../../utility"
import { formatCurrency, fetchTransactionAndCategories } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";

export default function DeleteTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  if (userRole !== 1) {
    console.log("NOT YET IMPLEMENTED FOR STANDARD!");
    return 
    // dont remove this, this is for future notification and request for delition if not admin
  }

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [transactionId, setTransactionId] = useState<string>("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // --- Fetch transaction by ID ---
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

      setTransaction(transaction);
      setCategories(categories);

    } catch {
      setError("Transaction not found.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id: number) => {
    const found = categories.find((c) => c.id === id);
    return found ? found.name : "Unknown";
  };

  // --- Handle Enter key on ID input ---
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleFetch();
    }
  };

  // --- Proceed to confirmation ---
  const handleProceed = () => {
    if (!transaction) return;

    setError("");
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  

  const handleConfirmUpdate = async () => {
    if (!transaction) return;
    if (!token || !tokenType) return alert("Not authorized");
    
    if (userRole !== 1) return;

    try {
      await api.delete(
        `api/transactions/${transactionId}`,
        {
          headers: { Authorization: `${tokenType} ${token}` }
        }
      );

      alert("TRANSACTION DELETED");
      setShowConfirmation(false);
      onClose();

    } catch (err) {
      console.error(err);
      setError("Failed to update transaction.");
    }
  };

  return (
    <>
      {!showConfirmation && (
        <div
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px",
              position: "relative"
            }}
          >
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "22px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Delete Transaction</h2>

            {!transaction && (
              <>
                <input
                  type="number"
                  value={transactionId}
                  placeholder="Enter ID to Update"
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d{0,3}$/.test(val)) setTransactionId(val);
                  }}
                  onKeyDown={handleKeyPress}
                  style={{ width: "100%", marginBottom: "1rem" }}
                />

                <button onClick={handleFetch}>Load Transaction</button>
              </>
            )}

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {transaction && (
              <div style={{ marginBottom: "1rem" }}>
                <p><strong>ID:</strong> {transactionId}</p>
                <p><strong>Amount:</strong> {formatCurrency(transaction.amount)}</p>
                <p><strong>Category:</strong> {getCategoryName(transaction.category_id)}</p>
                <p><strong>Type:</strong> {transaction.transaction_type}</p>
                <p><strong>Description:</strong> {transaction.description}</p>
                <p><strong>Date: </strong> {transaction.transaction_date}</p>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button onClick={() => setTransaction(null)}>Back</button>
                  <button onClick={handleProceed}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmation && transaction && (
        <div
          onClick={handleBackToEdit}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "320px",
              position: "relative"
            }}
          >
            <button
              onClick={handleBackToEdit}
              style={{
                position: "absolute",
                top: "8px",
                right: "12px",
                background: "transparent",
                border: "none",
                color: "#aaa",
                fontSize: "22px",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Confirm Delete</h2>

            <p><strong>DELETE ID:</strong> {transactionId}</p>

            <div style={{ marginBottom: "1rem" }}>
                <p><strong>Amount:</strong> {formatCurrency(transaction.amount)}</p>
                <p><strong>Category:</strong> {getCategoryName(transaction.category_id)}</p>
              <p><strong>Type:</strong> {transaction.transaction_type}</p>
              <p><strong>Description:</strong> {transaction.description}</p>
              <p><strong>Date: </strong> {transaction.transaction_date}</p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirmUpdate}>Confirm DELETION</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}