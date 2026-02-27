import { useEffect, useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";

import type { ReadTransactionHistory, Category } from "../schemas/transaction";
import { formatDate } from "../../../../utility";
import type { OnCloseProps } from "../../../../utility";
import { useOutsideClickStrict } from "../../../../utilityHooks";

export default function HistoryTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [transactionHistory, setTransactionHistory] = useState<ReadTransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"all" | "own">("all"); // New state for view mode

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token || !tokenType) return;

        // API call to fetch all transactions
        const [transRes, catRes] = await Promise.all([
          api.get("api/transactions/history", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
          api.get("api/categories/"),
        ]);

        // Add category data into transaction history
        const filteredTrans: ReadTransactionHistory[] = transRes.data;

        console.log("TRANSACTION FILTER: ",filteredTrans)
        console.log("CATEGORY FILTER", catRes.data)


        setTransactionHistory(filteredTrans);
        setCategories(catRes.data);

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, tokenType]);

  const getCategoryName = (id: number) => {
    const found = categories.find((c) => c.id === id);
    return found ? found.name : "Unknown";
  };



  // Filter transactions based on the selected view mode
  const filteredTransHistory = viewMode === "all" ? transactionHistory : transactionHistory.filter(tx => tx.user_id === user?.id);

  return (
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
        alignItems: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1414",
          padding: "1.5rem",
          borderRadius: "8px",
          minWidth: "900px",
          maxHeight: "80vh",
          overflow: "auto",
          position: "relative",
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
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2 style={{ textAlign: "center" }}>Transaction History</h2>

        {/* Add role-based dropdown */}
        {userRole === 1 && (
          <select onChange={(e) => setViewMode(e.target.value as "all" | "own")}>
            <option value="all">Show All</option>
            <option value="own">Show Your Own View Only</option>
          </select>
        )}

        {loading && <p>Loading...</p>}

        {!loading && filteredTransHistory.length === 0 && <p>No transactions found.</p>}

        {!loading && filteredTransHistory.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "1rem",
              textAlign: "left",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Transac ID</th>
                {userRole === 1 && <th style={thStyle}>User ID</th>}
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Action Taken At</th>
                <th style={thStyle}>Old Description</th>
                <th style={thStyle}>New Description</th>
                <th style={thStyle}>Old Transaction Date</th>
                <th style={thStyle}>New Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransHistory.map((tx) => (
                <tr key={tx.id}>
                  <td style={tdStyle}>{tx.entity_id}</td>
                  {userRole === 1 && <td style={tdStyle}>{tx.user_id}</td>}
                  <td style={tdStyle}>{getCategoryName(tx.category_id)}</td>
                  <td style={tdStyle}>{tx.transaction_type}</td>
                  <td style={tdStyle}>{tx.action}</td>
                  <td style={tdStyle}>{formatDate(tx.action_taken_at)}</td>
                  <td style={tdStyle}>{tx.old_description}</td>
                  <td style={tdStyle}>{tx.new_description}</td>
                  <td style={tdStyle}>{tx.old_transaction_date}</td>
                  <td style={tdStyle}>{tx.new_transaction_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Table cell styles
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