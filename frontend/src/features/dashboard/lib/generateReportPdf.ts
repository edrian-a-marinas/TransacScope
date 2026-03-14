import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GeneratePDFProps } from "@/features/dashboard/schemas/report";

export function generateReportPDF({ reportResult, reportMode, viewMode }: GeneratePDFProps) {
  if (!reportResult) return;
  const doc = new jsPDF();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const cleanNumber = (value: any): number => {
    if (typeof value === "number") return value;
    return Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
  };
  const peso = (value: number): string => {
    const abs   = Math.abs(value);
    const parts = abs.toFixed(2).split(".");
    parts[0]    = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };
  const fmtDate = (dateString: string): string => {
    const d       = new Date(dateString);
    const year    = d.getFullYear();
    const month   = String(d.getMonth() + 1).padStart(2, "0");
    const day     = String(d.getDate()).padStart(2, "0");
    const hours   = String(d.getHours() % 12 || 12).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm    = d.getHours() >= 12 ? "PM" : "AM";
    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm} (UTC+8)`;
  };

  // ── Average helpers (mirrors modal logic) ─────────────────────────────────
  const reportType = reportResult.report.report_type;
  const startDate  = reportResult.report.start_date;
  const endDate    = reportResult.report.end_date;

  const diffDays = Math.max(1, Math.ceil(
    (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86_400_000
  ));
  const calendarPeriods =
    reportType === "daily"   ? diffDays :
    reportType === "weekly"  ? Math.max(1, Math.ceil(diffDays / 7)) :
    Math.max(1, Math.ceil(diffDays / 30));

  const perLabel =
    reportType === "daily"   ? "day" :
    reportType === "weekly"  ? "week" :
    "month";

  // Active periods — unique period keys with entries
  const seenKeys: Record<string, boolean> = {};
  reportResult.summary.forEach((item: any) => {
    let key = "default";
    if      (reportType === "weekly")  key = (item.week_start ?? "") + "-" + (item.week_end ?? "");
    else if (reportType === "daily")   key = item.date || "unknown";
    else if (reportType === "monthly") key = "monthly";
    seenKeys[key] = true;
  });
  const activePeriods = Math.max(1, Object.keys(seenKeys).length);

  // ── Group summary by period ───────────────────────────────────────────────
  const grouped: Record<string, any[]> = {};
  reportResult.summary.forEach(item => {
    let key = "default";
    if      (reportType === "weekly")  key = `${item.week_start} to ${item.week_end}`;
    else if (reportType === "daily")   key = item.date || "Unknown";
    else if (reportType === "monthly") key = `${startDate} to ${endDate}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  const isMultiPeriod = !(Object.keys(grouped).length === 1 && Object.keys(grouped)[0] === "default");

  // ── Grand totals ──────────────────────────────────────────────────────────
  const grandIncome  = reportResult.summary.filter(i => i.transaction_type === "Income") .reduce((a, i) => a + cleanNumber(i.total_amount), 0);
  const grandExpense = reportResult.summary.filter(i => i.transaction_type === "Expense").reduce((a, i) => a + cleanNumber(i.total_amount), 0);
  const grandNet     = grandIncome - grandExpense;
  const totalEntries = reportResult.summary.reduce((a, i) => a + (i.entry_count ?? 1), 0);
  const modeLabel    = reportMode.charAt(0).toUpperCase() + reportMode.slice(1);

  // ── Averages ──────────────────────────────────────────────────────────────
  const activeAvgIncome  = grandIncome  / activePeriods;
  const activeAvgExpense = grandExpense / activePeriods;
  const activeAvgNet     = grandNet     / activePeriods;
  const calAvgIncome     = grandIncome  / calendarPeriods;
  const calAvgExpense    = grandExpense / calendarPeriods;
  const calAvgNet        = grandNet     / calendarPeriods;

  // ── Colors ────────────────────────────────────────────────────────────────
  const DARK   : [number,number,number] = [45,  45,  45];
  const MID    : [number,number,number] = [90,  90,  90];
  const LIGHT  : [number,number,number] = [220, 220, 220];
  const GREEN  : [number,number,number] = [30,  150, 100];
  const RED    : [number,number,number] = [190, 50,  50];
  const DKGREEN: [number,number,number] = [14,  100, 65];
  const DKRED  : [number,number,number] = [150, 25,  25];
  const WHITE  : [number,number,number] = [255, 255, 255];
  const NEAR_BLACK: [number,number,number] = [40, 40, 40];

  // ── PDF header ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${modeLabel.toUpperCase()} REPORT SUMMARY`, 105, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 28;
  const lines = [
    `View Mode    : ${viewMode === "all users" ? "All Users" : "Own"}`,
    `Report Type  : ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`,
    `Date Range   : ${fmtDate(startDate)} to ${fmtDate(endDate)}`,
    `Generated At : ${fmtDate(reportResult.report.created_at)}`,
    `Currency     : PHP`,
    `Total Entries: ${totalEntries}`,
  ];
  lines.forEach(line => { doc.text(line, 14, y); y += 6; });
  y += 4;

  // ── Build table rows ──────────────────────────────────────────────────────
  const tableBody: any[] = [];
  Object.entries(grouped).forEach(([periodKey, items]) => {
    const periodEntries = items.reduce((a, i) => a + (i.entry_count ?? 1), 0);
    const incomeItems   = items.filter(i => i.transaction_type === "Income");
    const expenseItems  = items.filter(i => i.transaction_type === "Expense");

    if (isMultiPeriod) {
      tableBody.push([{
        content: `${periodKey}   (${periodEntries} ${periodEntries === 1 ? "entry" : "entries"})`,
        colSpan: 2,
        styles: { halign: "left", fontStyle: "bold", fontSize: 9, fillColor: MID, textColor: WHITE, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
      }]);
    }

    if (incomeItems.length > 0) {
      if (expenseItems.length > 0 || reportMode === "combined") {
        tableBody.push([{ content: `  INCOME`, colSpan: 2, styles: { halign: "left", fontStyle: "italic", fontSize: 8, fillColor: LIGHT, textColor: NEAR_BLACK } }]);
      }
      incomeItems.forEach(i => {
        const tag = i.entry_count && i.entry_count > 1 ? ` x${i.entry_count}` : "";
        tableBody.push([
          { content: `  ${i.category_name}${tag}`, styles: { halign: "left" } },
          { content: `+${peso(cleanNumber(i.total_amount))}`, styles: { halign: "right", textColor: GREEN } },
        ]);
      });
    }

    if (expenseItems.length > 0) {
      if (incomeItems.length > 0 || reportMode === "combined") {
        tableBody.push([{ content: `  EXPENSE`, colSpan: 2, styles: { halign: "left", fontStyle: "italic", fontSize: 8, fillColor: LIGHT, textColor: NEAR_BLACK } }]);
      }
      expenseItems.forEach(i => {
        const tag = i.entry_count && i.entry_count > 1 ? ` x${i.entry_count}` : "";
        tableBody.push([
          { content: `  ${i.category_name}${tag}`, styles: { halign: "left" } },
          { content: `-${peso(cleanNumber(i.total_amount))}`, styles: { halign: "right", textColor: RED } },
        ]);
      });
    }
  });

  // ── Subtotal rows (income / expense totals shown only when relevant) ──────
  if (grandIncome > 0) {
    tableBody.push([
      { content: "Total Income",  styles: { halign: "left",  fontStyle: "bold", fillColor: LIGHT } },
      { content: `+${peso(grandIncome)}`,  styles: { halign: "right", fontStyle: "bold", fillColor: LIGHT, textColor: DKGREEN } },
    ]);
  }
  if (grandExpense > 0) {
    tableBody.push([
      { content: "Total Expense", styles: { halign: "left",  fontStyle: "bold", fillColor: LIGHT } },
      { content: `-${peso(grandExpense)}`, styles: { halign: "right", fontStyle: "bold", fillColor: LIGHT, textColor: DKRED } },
    ]);
  }

  // ── Render main table ─────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [["Category", "Amount (PHP)"]],
    body: tableBody,
    styles:     { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  let finalY = (doc as any).lastAutoTable?.finalY ?? y + 10;

  // ── Bottom total line — label matches reportMode ──────────────────────────
  const bottomLabel =
    reportMode === "income"  ? "TOTAL INCOME"  :
    reportMode === "expense" ? "TOTAL EXPENSE" :
    "NET RESULT";

  const bottomValue =
    reportMode === "income"  ? grandIncome  :
    reportMode === "expense" ? grandExpense :
    grandNet;

  const bottomSign  =
    reportMode === "income"  ? "+" :
    reportMode === "expense" ? "-" :
    bottomValue >= 0 ? "+" : "-";

  const bottomColor = (reportMode === "income" || (reportMode === "combined" && grandNet >= 0))
    ? DKGREEN : DKRED;

  doc.setDrawColor(160, 160, 160);
  doc.line(14, finalY + 5, 196, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(bottomLabel, 14, finalY + 13);
  doc.setTextColor(...bottomColor);
  doc.text(`${bottomSign}${peso(Math.abs(bottomValue))}`, 196, finalY + 13, { align: "right" });
  doc.setTextColor(0, 0, 0);

  finalY += 20;

  // ── Average per period section ────────────────────────────────────────────
  const avgBody: any[] = [];

  // Active periods row header
  avgBody.push([{
    content: `Active ${perLabel}s — ${activePeriods} ${perLabel}${activePeriods !== 1 ? "s" : ""} with entries`,
    colSpan: 2,
    styles: { halign: "left", fontStyle: "bold", fontSize: 8, fillColor: MID, textColor: WHITE, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
  }]);

  if (reportMode === "income" || reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Income",  styles: { halign: "left" } },
      { content: `+${peso(activeAvgIncome)}`,  styles: { halign: "right", textColor: GREEN } },
    ]);
  }
  if (reportMode === "expense" || reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Expense", styles: { halign: "left" } },
      { content: `-${peso(activeAvgExpense)}`, styles: { halign: "right", textColor: RED } },
    ]);
  }
  if (reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Net",     styles: { halign: "left" } },
      { content: `${activeAvgNet >= 0 ? "+" : "-"}${peso(Math.abs(activeAvgNet))}`, styles: { halign: "right", textColor: activeAvgNet >= 0 ? GREEN : RED } },
    ]);
  }

  // Calendar periods row header
  avgBody.push([{
    content: `Calendar ${perLabel}s — ${calendarPeriods} ${perLabel}${calendarPeriods !== 1 ? "s" : ""} in range`,
    colSpan: 2,
    styles: { halign: "left", fontStyle: "bold", fontSize: 8, fillColor: LIGHT, textColor: NEAR_BLACK, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 } },
  }]);

  if (reportMode === "income" || reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Income",  styles: { halign: "left", textColor: MID } },
      { content: `+${peso(calAvgIncome)}`,  styles: { halign: "right", textColor: GREEN } },
    ]);
  }
  if (reportMode === "expense" || reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Expense", styles: { halign: "left", textColor: MID } },
      { content: `-${peso(calAvgExpense)}`, styles: { halign: "right", textColor: RED } },
    ]);
  }
  if (reportMode === "combined") {
    avgBody.push([
      { content: "  Avg Net",     styles: { halign: "left", textColor: MID } },
      { content: `${calAvgNet >= 0 ? "+" : "-"}${peso(Math.abs(calAvgNet))}`, styles: { halign: "right", textColor: calAvgNet >= 0 ? GREEN : RED } },
    ]);
  }

  autoTable(doc, {
    startY: finalY,
    head: [[`Average per ${perLabel.charAt(0).toUpperCase() + perLabel.slice(1)}`, "Amount (PHP)"]],
    body: avgBody,
    styles:     { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 40 },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const now      = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const timePart = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  doc.save(`${modeLabel}_Report_${datePart}_${timePart}.pdf`);
}