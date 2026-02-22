import { useEffect, useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";

import type { OnCloseProps, Category, ReadTransaction } from "../schemas/transaction";

export default function ViewTransaction({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [transactions, setTransactions] = useState<ReadTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "own">("all"); // New state for view mode

  const token = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token || !tokenType) return;

        // API call to fetch all transactions
        const [transRes, catRes] = await Promise.all([
          api.get("api/transactions/", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
          api.get("api/categories/"),
        ]);

        const filteredTrans: ReadTransaction[] = transRes.data.filter(
          (t: ReadTransaction) => !t.deleted_at
        );

        filteredTrans.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setTransactions(filteredTrans);
        setCategories(catRes.data);
      } catch (err) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, tokenType]);

  // Ensure the created_at field is valid and formatted properly
  const formatDate = (date: string | null) => {
    if (!date) return "No Date";
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) return "Invalid Date";

    const formattedDate = parsedDate.toLocaleDateString("en-US");
    const formattedTime = parsedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${formattedDate}, ${formattedTime}`;
  };


  const getCategoryName = (id: number) => {
    const found = categories.find((c) => c.id === id);
    return found ? found.name : "Unknown";
  };

  // Filter transactions based on the selected view mode
  const filteredTransactions = viewMode === "all" ? transactions : transactions.filter(tx => tx.user_id === user?.id);

  return (
    <div
      onClick={onClose}
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

        <h2 style={{ textAlign: "center" }}>View Transactions</h2>

        {/* Add role-based dropdown */}
        {userRole === 1 && (
          <select onChange={(e) => setViewMode(e.target.value as "all" | "own")}>
            <option value="all">Show All</option>
            <option value="own">Show Your Own View Only</option>
          </select>
        )}

        {loading && <p>Loading...</p>}

        {!loading && filteredTransactions.length === 0 && <p>No transactions found.</p>}

        {!loading && filteredTransactions.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "1rem",
              textAlign: "left",
            }}
          >
            <thead>
              <th style={thStyle}>ID</th>
              {userRole === 1 && <th style={thStyle}>User ID</th>}
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Transaction Date</th>
              <th style={thStyle}>Created At</th>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={tdStyle}>{tx.id}</td>
                  {userRole === 1 && <td style={tdStyle}>{tx.user_id}</td>}
                  <td style={tdStyle}>{getCategoryName(tx.category_id)}</td>
                  <td style={tdStyle}>₱{tx.amount}</td>
                  <td style={tdStyle}>{tx.transaction_type}</td>
                  <td style={tdStyle}>{tx.description}</td>
                  <td style={tdStyle}>{tx.transaction_date}</td>
                  <td style={tdStyle}>{formatDate(tx.created_at)}</td>
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