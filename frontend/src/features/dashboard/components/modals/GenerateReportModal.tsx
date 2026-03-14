import { useState, useContext, useMemo } from "react";
import { ChevronRight, ChevronLeft, FileText, Download, Loader2 } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import type { ReportType, ReportResult, OnCloseProps } from "@/features/dashboard/schemas/report";
import { generateReportPDF } from "@/features/dashboard/lib/generateReportPdf";
import Shell, { ShellTable } from "./shared/Shell";
import ModalHeader from "./shared/ModalHeader";
import ErrorBox from "./shared/ErrorBox";
import InfoRow from "./shared/InfoRow";
import { C, inputStyle, labelStyle } from "./shared";

const MODE_LABEL: Record<string, string> = {
  income:   "Income",
  expense:  "Expense",
  combined: "Combined",
};
const MODE_COLOR: Record<string, string> = {
  income:   C.income,
  expense:  C.expense,
  combined: C.primary,
};

// ── Average helpers ───────────────────────────────────────────────────────────
function countPeriods(reportType: ReportType, startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end   = new Date(`${endDate}T00:00:00`);
  const diffMs   = end.getTime() - start.getTime();
  const diffDays = Math.max(1, Math.ceil(diffMs / 86_400_000));
  if (reportType === "daily")   return diffDays;
  if (reportType === "weekly")  return Math.max(1, Math.ceil(diffDays / 7));
  if (reportType === "monthly") return Math.max(1, Math.ceil(diffDays / 30));
  return 1;
}

function periodLabel(reportType: ReportType): string {
  if (reportType === "daily")   return "day";
  if (reportType === "weekly")  return "week";
  if (reportType === "monthly") return "month";
  return "period";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GenerateReportModal({ reportMode, onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const isAdmin   = user!.role_id === 1;
  const modeColor = MODE_COLOR[reportMode] ?? C.primary;
  const modeLabel = MODE_LABEL[reportMode] ?? reportMode;

  const [reportType,        setReportType]        = useState<ReportType>("monthly");
  const [startDate,         setStartDate]         = useState("");
  const [endDate,           setEndDate]           = useState("");
  const [viewMode,          setViewMode]          = useState<"all users" | "own">(isAdmin ? "all users" : "own");
  const [loading,           setLoading]           = useState(false);
  const [showConfirmation,  setShowConfirmation]  = useState(false);
  const [showSummary,       setShowSummary]       = useState(false);
  const [reportResult,      setReportResult]      = useState<ReportResult | null>(null);
  const [error,             setError]             = useState<string | null>(null);
  const [focusedField,      setFocusedField]      = useState<string | null>(null);
  const [backdropPressed,   setBackdropPressed]   = useState(false);

  const handleBackdropMouseDown = () => setBackdropPressed(true);
  const handleBackdropMouseUp   = () => { if (backdropPressed) onClose(); setBackdropPressed(false); };

  const handleSubmit = () => {
    if (!startDate || !endDate) { setError("Start and End date are required."); return; }
    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      setError("End date cannot be earlier than Start date."); return;
    }
    setError(null);
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    if (loading) return;
    setError(null);
    setShowConfirmation(false);
    setReportResult(null);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post("api/reports/?transaction_type=" + reportMode, {
        report_type: reportType,
        start_date:  startDate,
        end_date:    endDate,
        all_users:   isAdmin ? viewMode === "all users" : false,
      });
      if (!response.data.summary || response.data.summary.length === 0) {
        setError("No transactions found for the selected period."); return;
      }
      setReportResult(response.data);
      setShowConfirmation(false);
      setShowSummary(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to generate ${modeLabel} report.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSummary = () => { setShowSummary(false); onClose(); };

  const groupSummary = () => {
    if (!reportResult) return {};
    const grouped: Record<string, any[]> = {};
    reportResult.summary.forEach(item => {
      let key = "default";
      if      (reportResult.report.report_type === "weekly")  key = `${item.week_start} → ${item.week_end}`;
      else if (reportResult.report.report_type === "daily")   key = item.date || "Unknown Date";
      else if (reportResult.report.report_type === "monthly") key = `${reportResult.report.start_date} → ${reportResult.report.end_date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const groupedData  = groupSummary();
  const totalIncome  = reportResult?.summary.filter(i => i.transaction_type === "Income") .reduce((a, i) => a + i.total_amount, 0) ?? 0;
  const totalExpense = reportResult?.summary.filter(i => i.transaction_type === "Expense").reduce((a, i) => a + i.total_amount, 0) ?? 0;
  const overallTotal = totalIncome - totalExpense;

  // ── Average stats (only when reportResult exists) ─────────────────────────
  const avgStats = useMemo(() => {
    if (!reportResult) return null;
    const calendarPeriods = countPeriods(reportResult.report.report_type, reportResult.report.start_date, reportResult.report.end_date);
    const perLabel        = periodLabel(reportResult.report.report_type);

    // Active periods = unique period keys that actually have entries
    const seenKeys: Record<string, boolean> = {};
    reportResult.summary.forEach((item: any) => {
      let key = "default";
      if      (reportResult.report.report_type === "weekly")  key = item.week_start + "-" + item.week_end;
      else if (reportResult.report.report_type === "daily")   key = item.date || "unknown";
      else if (reportResult.report.report_type === "monthly") key = "monthly";
      seenKeys[key] = true;
    });
    const activePeriods = Math.max(1, Object.keys(seenKeys).length);

    // Calendar avg — spread over full date range
    const calendarAvgIncome  = totalIncome  / calendarPeriods;
    const calendarAvgExpense = totalExpense / calendarPeriods;
    const calendarAvgNet     = (totalIncome - totalExpense) / calendarPeriods;

    // Active avg — only periods with actual entries
    const activeAvgIncome  = totalIncome  / activePeriods;
    const activeAvgExpense = totalExpense / activePeriods;
    const activeAvgNet     = (totalIncome - totalExpense) / activePeriods;

    return {
      calendarPeriods, activePeriods, perLabel,
      calendarAvgIncome, calendarAvgExpense, calendarAvgNet,
      activeAvgIncome,   activeAvgExpense,   activeAvgNet,
    };
  }, [reportResult, totalIncome, totalExpense]);

  // ── Correct bottom label based on report mode ─────────────────────────────
  const bottomLabel =
    reportMode === "income"   ? "Total Income"  :
    reportMode === "expense"  ? "Total Expense" :
    "Net Result";

  const bottomValue =
    reportMode === "income"   ? totalIncome  :
    reportMode === "expense"  ? totalExpense :
    overallTotal;

  const bottomColor =
    reportMode === "income"   ? C.income  :
    reportMode === "expense"  ? C.expense :
    overallTotal >= 0 ? C.income : C.expense;

  const bottomSign =
    reportMode === "income"   ? "+" :
    reportMode === "expense"  ? "-" :
    overallTotal >= 0 ? "+" : "-";

  // ── Shared footer ─────────────────────────────────────────────────────────
  const ModalFooter = ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
      {left}
      {right}
    </div>
  );

  // ── Step 1 — Form ─────────────────────────────────────────────────────────
  if (!showConfirmation && !showSummary) return (
    <Shell maxWidth="narrow" onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title={`${modeLabel} Report`}
        subtitle="Configure your report parameters"
        icon={FileText}
        iconColor={modeColor}
        onClose={onClose}
      />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        <ErrorBox message={error ?? undefined} />
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {isAdmin && (
            <div>
              <label style={labelStyle}>View Mode</label>
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as "all users" | "own")}
                onFocus={() => setFocusedField("viewMode")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "viewMode" ? C.borderFoc : C.border }}
              >
                <option value="all users" style={{ background: C.surface }}>All Users</option>
                <option value="own"       style={{ background: C.surface }}>My Own Only</option>
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Report Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as ReportType)}
              onFocus={() => setFocusedField("reportType")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "reportType" ? C.borderFoc : C.border }}
            >
              <option value="monthly" style={{ background: C.surface }}>Monthly</option>
              <option value="weekly"  style={{ background: C.surface }}>Weekly</option>
              <option value="daily"   style={{ background: C.surface }}>Daily</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                onFocus={() => setFocusedField("startDate")} onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "startDate" ? C.borderFoc : C.border, colorScheme: "dark" }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                onFocus={() => setFocusedField("endDate")} onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "endDate" ? C.borderFoc : C.border, colorScheme: "dark" }}
              />
            </div>
          </div>
        </div>
      </div>
      <ModalFooter
        left={
          <button onClick={onClose} style={{ flex: 1, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
            Cancel
          </button>
        }
        right={
          <button onClick={handleSubmit} style={{ flex: 2, padding: "0.6rem", borderRadius: "0.5rem", border: "none", background: modeColor, color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            Review <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
          </button>
        }
      />
    </Shell>
  );

  // ── Step 2 — Confirm ──────────────────────────────────────────────────────
  if (showConfirmation) return (
    <Shell maxWidth="narrow" onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title="Confirm Report"
        subtitle="Review settings before generating"
        icon={FileText}
        iconColor={modeColor}
        onClose={handleBackToEdit}
      />
      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        <ErrorBox message={error ?? undefined} />
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{
            display: "inline-block", padding: "0.3rem 1rem", borderRadius: "999px",
            fontSize: "0.8rem", fontWeight: 600,
            backgroundColor: `${modeColor}18`, color: modeColor, border: `1px solid ${modeColor}40`,
          }}>
            {modeLabel} Report
          </span>
        </div>
        <InfoRow label="View Mode"   value={viewMode === "all users" ? "All Users" : "My Own Only"} />
        <InfoRow label="Report Type" value={reportType.charAt(0).toUpperCase() + reportType.slice(1)} />
        <InfoRow label="Start Date"  value={startDate} />
        <InfoRow label="End Date"    value={endDate} />
      </div>
      <ModalFooter
        left={
          <button onClick={handleBackToEdit} disabled={loading} style={{ flex: 1, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
          </button>
        }
        right={
          <button onClick={handleConfirm} disabled={loading} style={{ flex: 2, padding: "0.6rem", borderRadius: "0.5rem", border: "none", background: loading ? C.surfaceEl : modeColor, color: loading ? C.fgMuted : "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            {loading
              ? <><Loader2 style={{ width: "0.9rem", height: "0.9rem", animation: "spin 1s linear infinite" }} /> Generating…</>
              : "Confirm & Generate"
            }
          </button>
        }
      />
    </Shell>
  );

  // ── Step 3 — Summary ──────────────────────────────────────────────────────
  if (showSummary && reportResult) return (
    <ShellTable maxWidth="wide" onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title={`${modeLabel} Report Summary`}
        subtitle={`${formatDate(reportResult.report.start_date)} → ${formatDate(reportResult.report.end_date)}`}
        icon={FileText}
        iconColor={modeColor}
        onClose={handleCloseSummary}
      />
      <div style={{ overflowY: "auto", flex: 1, padding: "1.5rem", minHeight: 0 }}>

        {/* Report meta */}
        <div style={{ marginBottom: "1.25rem" }}>
          <InfoRow label="View Mode"    value={viewMode === "all users" ? "All Users" : "Own"} />
          <InfoRow label="Report Type"  value={reportResult.report.report_type} />
          <InfoRow label="Generated At" value={formatDate(reportResult.report.created_at)} />
        </div>

        {/* Period breakdown */}
        {Object.entries(groupedData).map(([periodKey, items], idx) => {
          const groupIncome  = items.filter(i => i.transaction_type === "Income") .reduce((a: number, i: any) => a + i.total_amount, 0);
          const groupExpense = items.filter(i => i.transaction_type === "Expense").reduce((a: number, i: any) => a + i.total_amount, 0);
          const totalEntries = items.reduce((a: number, i: any) => a + (i.entry_count ?? 1), 0);
          return (
            <div key={idx} style={{ marginBottom: "1.25rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.75rem", overflow: "hidden" }}>
              {periodKey !== "default" && (
                <div style={{ padding: "0.5rem 1rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.75rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{periodKey}</span>
                  <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 600, color: C.fg }}>
                    {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                  </span>
                </div>
              )}
              <div style={{ padding: "0.75rem 1rem" }}>
                {/* Income section */}
                {items.some((i: any) => i.transaction_type === "Income") && (
                  <div style={{ marginBottom: items.some((i: any) => i.transaction_type === "Expense") ? "1rem" : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.income, background: "hsl(160 60% 45% / 0.12)", border: `1px solid ${C.income}40`, borderRadius: "999px", padding: "0.1rem 0.5rem" }}>
                        INCOME · {items.filter((i: any) => i.transaction_type === "Income").length} entries
                      </span>
                    </div>
                    {items.filter((i: any) => i.transaction_type === "Income").map((i: any, ii: number) => (
                      <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: `1px solid ${C.border}`, fontSize: "0.8rem" }}>
                        <span style={{ color: C.fg }}>{i.category_name}{i.entry_count > 1 && <span style={{ color: C.fgMuted }}> ×{i.entry_count}</span>}</span>
                        <span style={{ color: C.income, fontWeight: 600 }}>+₱{formatCurrency(i.total_amount).replace("₱ ", "")}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: C.income }}>
                      Total: +₱{formatCurrency(groupIncome).replace("₱ ", "")}
                    </div>
                  </div>
                )}
                {/* Expense section */}
                {items.some((i: any) => i.transaction_type === "Expense") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.expense, background: "hsl(0 72% 51% / 0.12)", border: `1px solid ${C.expense}40`, borderRadius: "999px", padding: "0.1rem 0.5rem" }}>
                        EXPENSE · {items.filter((i: any) => i.transaction_type === "Expense").length} entries
                      </span>
                    </div>
                    {items.filter((i: any) => i.transaction_type === "Expense").map((i: any, ii: number) => (
                      <div key={ii} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: `1px solid ${C.border}`, fontSize: "0.8rem" }}>
                        <span style={{ color: C.fg }}>{i.category_name}{i.entry_count > 1 && <span style={{ color: C.fgMuted }}> ×{i.entry_count}</span>}</span>
                        <span style={{ color: C.expense, fontWeight: 600 }}>-₱{formatCurrency(i.total_amount).replace("₱ ", "")}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: C.expense }}>
                      Total: -₱{formatCurrency(groupExpense).replace("₱ ", "")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Average per period — two rows: active days vs calendar days ── */}
        {avgStats && (
          <div style={{ marginBottom: "0.75rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.75rem", overflow: "hidden" }}>
            <div style={{ padding: "0.5rem 1rem", borderBottom: `1px solid ${C.border}`, fontSize: "0.72rem", fontWeight: 700, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Average per {avgStats.perLabel}
            </div>

            {/* Row 1 — Active periods only */}
            <div style={{ padding: "0.5rem 1rem", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 600, color: C.fgMuted, margin: "0 0 0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Active {avgStats.perLabel}s
                <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "999px", padding: "0.05rem 0.45rem", fontSize: "0.65rem", fontWeight: 600, color: C.fg }}>
                  {avgStats.activePeriods} {avgStats.perLabel}{avgStats.activePeriods !== 1 ? "s" : ""} with entries
                </span>
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {(reportMode === "income" || reportMode === "combined") && (
                  <div style={{ flex: 1, minWidth: "110px", background: "hsl(160 60% 45% / 0.08)", border: `1px solid ${C.income}30`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Income</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: C.income, margin: 0 }}>
                      +₱{formatCurrency(avgStats.activeAvgIncome).replace("₱ ", "")}
                    </p>
                  </div>
                )}
                {(reportMode === "expense" || reportMode === "combined") && (
                  <div style={{ flex: 1, minWidth: "110px", background: "hsl(0 72% 51% / 0.08)", border: `1px solid ${C.expense}30`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Expense</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: C.expense, margin: 0 }}>
                      -₱{formatCurrency(avgStats.activeAvgExpense).replace("₱ ", "")}
                    </p>
                  </div>
                )}
                {reportMode === "combined" && (
                  <div style={{ flex: 1, minWidth: "110px", background: avgStats.activeAvgNet >= 0 ? "hsl(160 60% 45% / 0.08)" : "hsl(0 72% 51% / 0.08)", border: `1px solid ${avgStats.activeAvgNet >= 0 ? C.income : C.expense}30`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Net</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: avgStats.activeAvgNet >= 0 ? C.income : C.expense, margin: 0 }}>
                      {avgStats.activeAvgNet >= 0 ? "+" : "-"}₱{formatCurrency(Math.abs(avgStats.activeAvgNet)).replace("₱ ", "")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2 — Calendar periods (full date range) */}
            <div style={{ padding: "0.5rem 1rem" }}>
              <p style={{ fontSize: "0.68rem", fontWeight: 600, color: C.fgMuted, margin: "0 0 0.4rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                Calendar {avgStats.perLabel}s
                <span style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "999px", padding: "0.05rem 0.45rem", fontSize: "0.65rem", fontWeight: 600, color: C.fg }}>
                  {avgStats.calendarPeriods} {avgStats.perLabel}{avgStats.calendarPeriods !== 1 ? "s" : ""} in range
                </span>
              </p>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {(reportMode === "income" || reportMode === "combined") && (
                  <div style={{ flex: 1, minWidth: "110px", background: "hsl(160 60% 45% / 0.05)", border: `1px solid ${C.income}20`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Income</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: C.income, margin: 0, opacity: 0.75 }}>
                      +₱{formatCurrency(avgStats.calendarAvgIncome).replace("₱ ", "")}
                    </p>
                  </div>
                )}
                {(reportMode === "expense" || reportMode === "combined") && (
                  <div style={{ flex: 1, minWidth: "110px", background: "hsl(0 72% 51% / 0.05)", border: `1px solid ${C.expense}20`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Expense</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: C.expense, margin: 0, opacity: 0.75 }}>
                      -₱{formatCurrency(avgStats.calendarAvgExpense).replace("₱ ", "")}
                    </p>
                  </div>
                )}
                {reportMode === "combined" && (
                  <div style={{ flex: 1, minWidth: "110px", background: avgStats.calendarAvgNet >= 0 ? "hsl(160 60% 45% / 0.05)" : "hsl(0 72% 51% / 0.05)", border: `1px solid ${avgStats.calendarAvgNet >= 0 ? C.income : C.expense}20`, borderRadius: "0.45rem", padding: "0.45rem 0.65rem" }}>
                    <p style={{ fontSize: "0.65rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.15rem" }}>Avg Net</p>
                    <p style={{ fontSize: "0.88rem", fontWeight: 700, color: avgStats.calendarAvgNet >= 0 ? C.income : C.expense, margin: 0, opacity: 0.75 }}>
                      {avgStats.calendarAvgNet >= 0 ? "+" : "-"}₱{formatCurrency(Math.abs(avgStats.calendarAvgNet)).replace("₱ ", "")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Total / Net result — label changes based on report mode ── */}
        <div style={{
          background:   bottomColor === C.income ? "hsl(160 60% 45% / 0.08)" : "hsl(0 72% 51% / 0.08)",
          border:       `1px solid ${bottomColor}40`,
          borderRadius: "0.75rem", padding: "0.75rem 1rem",
          display:      "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {bottomLabel}
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: bottomColor }}>
            {bottomSign}₱{formatCurrency(Math.abs(bottomValue)).replace("₱ ", "")}
          </span>
        </div>

      </div>
      <ModalFooter
        left={
          <button onClick={handleCloseSummary} style={{ flex: 1, padding: "0.6rem", borderRadius: "0.5rem", border: `1px solid ${C.border}`, background: "transparent", color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}>
            Close
          </button>
        }
        right={
          <button onClick={() => reportResult && generateReportPDF({ reportResult, reportMode, viewMode })} style={{ flex: 2, padding: "0.6rem", borderRadius: "0.5rem", border: "none", background: modeColor, color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <Download style={{ width: "0.9rem", height: "0.9rem" }} /> Download PDF
          </button>
        }
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ShellTable>
  );

  return null;
}