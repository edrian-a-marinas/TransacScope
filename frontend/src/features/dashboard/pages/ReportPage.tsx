import { useState, useContext } from "react";
import api from "../../../services/apiClient";
import { AuthContext } from "../../auth/AuthContext";
import type { ReportType, ReportResult } from "../schemas/report";

export default function ReportsPage() {
  const { user } = useContext(AuthContext);

  const userRole = user!.role_id;

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError("Start and End date are required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
      };

      const response = await api.post("api/reports/", payload);

      setResult(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to generate report."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <title>Reports</title>
      <h1>Reports</h1>

      <h3>
        {userRole === 1
          ? "Admin Report (All Users)"
          : "Your Personal Report"}
      </h3>

      <div style={{ marginBottom: "1rem" }}>
        <label>Report Type:</label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Start Date:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>End Date:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate Report"}
      </button>

      {error && (
        <div style={{ marginTop: "1rem", color: "red" }}>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Report Summary</h2>

          <p>
            <strong>Type:</strong> {result.report.report_type}
          </p>
          <p>
            <strong>Range:</strong> {result.report.start_date} →{" "}
            {result.report.end_date}
          </p>
          <p>
            <strong>Generated At:</strong> {result.report.created_at}
          </p>

          <hr />

          {result.summary.length === 0 ? (
            <p>No transactions found in this period.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {result.summary.map((item, index) => (
                <li key={index} style={{ marginBottom: "0.75rem" }}>
                  <strong>{item.category_name}</strong>: ₱
                  {item.total_amount.toFixed(2)}

                  {"week_start" in item &&
                    item.week_start &&
                    item.week_end && (
                      <div style={{ fontSize: "0.85rem" }}>
                        Week: {item.week_start} → {item.week_end}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}