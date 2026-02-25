import { useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { OnCloseProps } from "../../../../utility";
import type { ReportType, ReportResult } from "../schemas/report";
import { formatDate, formatCurrency } from "../../../../utility";

export default function GenerateReportModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"all users" | "own">(
    userRole === 1 ? "all users" : "own"
  );

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleBackToEdit = () => setShowConfirmation(false);

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

  const handleCloseSummary = () => {
    setShowSummary(false);
    onClose();
  };

  // -------------------------
  // GROUPING LOGIC
  // -------------------------
  const groupSummary = () => {
    if (!reportResult) return {};

    const grouped: Record<string, any[]> = {};
    reportResult.summary.forEach((item) => {
      let key = "default";

      if (reportResult.report.report_type === "weekly") {
        key = `${item.week_start} → ${item.week_end}`;
      } else if (reportResult.report.report_type === "daily") {
        key = item.date || "Unknown Date";
      } else if (reportResult.report.report_type === "monthly") {
        key = `${reportResult.report.start_date} → ${reportResult.report.end_date}`;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return grouped;
  };

  const groupedData = groupSummary();

  // -------------------------
  // CALCULATE OVERALL TOTAL
  // -------------------------
  const overallTotal = reportResult
    ? reportResult.summary.reduce((acc, item) => acc + item.total_amount, 0)
    : 0;

  return (
    <>
      {/* FORM */}
      {!showConfirmation && !showSummary && (
        <div onClick={onClose} style={overlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <button onClick={onClose} style={closeBtnStyle}>×</button>

            <h2 style={{ textAlign: "center" }}>Generate Report</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}

            {userRole === 1 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <label>View Mode:</label>
                <select
                  value={viewMode}
                  onChange={(e) =>
                    setViewMode(e.target.value as "all users" | "own")
                  }
                >
                  <option value="all users">All Users</option>
                  <option value="own">My Own Only</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: "0.75rem" }}>
              <label>Report Type:</label>
              <select
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as ReportType)
                }
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={onClose}>Cancel</button>
              <button onClick={handleSubmit}>Generate</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION */}
      {showConfirmation && (
        <div onClick={handleBackToEdit} style={overlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <button onClick={handleBackToEdit} style={closeBtnStyle}>×</button>
            <h2>Confirm Report Generation</h2>
            <p><strong>Report Type:</strong> {reportType}</p>
            <p><strong>Date Range:</strong> {startDate} → {endDate}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirm} disabled={loading}>
                {loading ? "Generating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      {showSummary && reportResult && (
        <div onClick={handleCloseSummary} style={overlayStyle}>
          <div onClick={(e) => e.stopPropagation()} style={summaryStyle}>
            <button onClick={handleCloseSummary} style={closeBtnStyle}>×</button>

            <h2 style={{ textAlign: "center" }}>Report Summary</h2>
            <p><strong>View Mode:</strong> {viewMode === "all users" ? "All Users" : "Own"}</p>
            <p><strong>Report Type:</strong> {reportResult.report.report_type}</p>
            <p><strong>Date Range:</strong> {formatDate(reportResult.report.start_date)} → {formatDate(reportResult.report.end_date)}</p>
            <p><strong>Generated At:</strong> {formatDate(reportResult.report.created_at)}</p>

            <div style={{ marginTop: "1rem", fontWeight: "bold", borderTop: "1px solid #aaa", paddingTop: "0.5rem" }}></div>

            <hr style={{ opacity: 0.3 }} />

            {Object.entries(groupedData).map(([period, items], idx) => (
              <div key={idx} style={{ marginBottom: "1rem" }}>
                {reportResult.report.report_type === "weekly" && (
                  <h4>Week: {period} ({items.length} entries)</h4>
                )}
                {reportResult.report.report_type === "daily" && (
                  <h4>Day: {period} ({items.length} entries)</h4>
                )}
                {reportResult.report.report_type === "monthly" && (
                  <h4>Month: {period} ({items.length} entries)</h4>
                )}

                {items.map((item, i) => (
                  <div key={i}>
                    {item.category_name}: {formatCurrency(item.total_amount)}
                  </div>
                ))}

                <hr style={{ margin: "0.5rem 0", opacity: 0.2 }} />
              </div>
            ))}

            {/* OVERALL TOTAL */}
            <div style={{ marginTop: "1rem", fontWeight: "bold", borderTop: "1px solid #aaa", paddingTop: "0.5rem" }}>
              TOTAL - {formatCurrency(overallTotal)} (Overall)
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={handleCloseSummary}>Close</button>
               <button onClick={() => alert("DONT REMOVE THIS PLACEHOLDER ")}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------- STYLES ----------------
const overlayStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle = {
  background: "#1c1414",
  padding: "1.5rem",
  borderRadius: "8px",
  minWidth: "400px",
  position: "relative" as const,
};

const summaryStyle = {
  ...modalStyle,
  minWidth: "500px",
  maxHeight: "80vh",
  overflowY: "auto" as const,
};

const closeBtnStyle = {
  position: "absolute" as const,
  top: "8px",
  right: "12px",
  background: "transparent",
  border: "none",
  color: "#aaa",
  fontSize: "22px",
  cursor: "pointer",
};