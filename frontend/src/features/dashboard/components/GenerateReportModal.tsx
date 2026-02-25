import { useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { OnCloseProps } from "../schemas/transaction";
import type { ReportType, ReportResult } from "../schemas/report";

type GenerateReportModalProps = OnCloseProps & {
  onReportGenerated: (data: ReportResult) => void;
};

export default function GenerateReportModal({ onClose, onReportGenerated }: GenerateReportModalProps) {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "own">(userRole === 1 ? "all" : "own");

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Start and End date are required.");
      return;
    }
    setError(null);
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const payload = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        all_users: userRole === 1 ? viewMode === "all" : false,
      };
      const response = await api.post("api/reports/", payload);
      onReportGenerated(response.data);
      setShowConfirmation(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!showConfirmation && (
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
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value as "all" | "own")}>
                  <option value="all">All Users</option>
                  <option value="own">My Own Only</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label>Report Type:</label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
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
              <strong>Report Type:</strong> {reportType}
            </p>
            <p>
              <strong>Date Range:</strong> {startDate} → {endDate}
            </p>
            {userRole === 1 && <p><strong>View Mode:</strong> {viewMode}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={handleBackToEdit}>Go Back</button>
              <button onClick={handleConfirm} disabled={loading}>
                {loading ? "Generating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}