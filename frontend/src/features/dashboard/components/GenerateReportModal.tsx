import { useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { OnCloseProps } from "../schemas/transaction";
import type { ReportType, ReportResult } from "../schemas/report";



export default function GenerateReportModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"all users" | "own">(userRole === 1 ? "all users" : "own");

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Validate and show confirmation
  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Start and End date are required.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("End date cannot be earlier than Start date.");
      return;
    }

    setError(null);
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  // Step 2: Confirm report generation and show summary
  const handleConfirm = async () => {
    try {
      setLoading(true);
      const payload = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        all_users: userRole === 1 ? viewMode === "all users" : false,
      };
      const response = await api.post("api/reports/", payload);
      setReportResult(response.data);
      setShowConfirmation(false);
      setShowSummary(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // Close summary modal
  const handleCloseSummary = () => {
    setShowSummary(false);
    onClose();
  };

  return (
    <>
      {/* Step 0: Form to choose report */}
      {!showConfirmation && !showSummary && (
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
              minWidth: "400px",
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

            <h2 style={{ textAlign: "center" }}>Generate Report</h2>

            {error && <p style={{ color: "red" }}>{error}</p>}

            {userRole === 1 && (
              <div style={{ marginBottom: "1rem" }}>
                <label>View Mode:</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as "all users" | "own")}
                >
                  <option value="all users">All Users</option>
                  <option value="own">My Own Only</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label>Report Type:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>Start Date:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label>End Date:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={handleSubmit}>Generate</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Confirmation Page */}
      {showConfirmation && (
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
            alignItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1c1414",
              padding: "1.5rem",
              borderRadius: "8px",
              minWidth: "400px",
              position: "relative",
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
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h2 style={{ textAlign: "center" }}>Confirm Report Generation</h2>

            <p>
              <strong>View Mode:</strong>{" "}
              {viewMode === "all users" ? "All Users" : "Own"}
            </p>

            <p>
              <strong>Report Type:</strong> {reportType}
            </p>
            <p>
              <strong>Date Range:</strong> {startDate} → {endDate}
            </p>
            

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirm} disabled={loading}>
                {loading ? "Generating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Summary Page */}
      {showSummary && reportResult && (
        <div
          onClick={handleCloseSummary}
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
              minWidth: "500px",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={handleCloseSummary}
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

            <h2 style={{ textAlign: "center" }}>Report Summary</h2>
            <p>
              <strong>View Mode:</strong>{" "}
              {viewMode === "all users" ? "All Users" : "Own"}
            </p>
            <p><strong>Report Type:</strong> {reportResult.report.report_type}</p>
            <p><strong>Date Range:</strong> {reportResult.report.start_date} → {reportResult.report.end_date}</p>
            <p><strong>Generated At:</strong> {reportResult.report.created_at}</p>

            <hr />

            {reportResult.summary.length === 0 ? (
              <p>No transactions found in this period.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {reportResult.summary.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: "0.75rem" }}>
                    <strong>{item.category_name}</strong>: ₱{item.total_amount.toFixed(2)}
                    {"week_start" in item && item.week_start && item.week_end && (
                      <div style={{ fontSize: "0.85rem" }}>
                        Week: {item.week_start} → {item.week_end}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button onClick={handleCloseSummary}>Close</button>
              <button onClick={() => alert("Download PDF placeholder")}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}