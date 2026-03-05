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

  // ASCII-safe date — avoids jsPDF latin-1 encoding garbling special chars
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

  // ── Group summary by period ───────────────────────────────────────────────
  const grouped: Record<string, any[]> = {};
  reportResult.summary.forEach(item => {
    let key = "default";
    if      (reportResult.report.report_type === "weekly")  key = `${item.week_start} to ${item.week_end}`;
    else if (reportResult.report.report_type === "daily")   key = item.date || "Unknown";
    else if (reportResult.report.report_type === "monthly") key = `${reportResult.report.start_date} to ${reportResult.report.end_date}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const isMultiPeriod = !(Object.keys(grouped).length === 1 && Object.keys(grouped)[0] === "default");

  // ── Grand totals ──────────────────────────────────────────────────────────
  const grandIncome  = reportResult.summary
    .filter(i => i.transaction_type === "Income")
    .reduce((a, i) => a + cleanNumber(i.total_amount), 0);
  const grandExpense = reportResult.summary
    .filter(i => i.transaction_type === "Expense")
    .reduce((a, i) => a + cleanNumber(i.total_amount), 0);
  const grandNet     = grandIncome - grandExpense;
  const totalEntries = reportResult.summary.reduce((a, i) => a + (i.entry_count ?? 1), 0);

  const modeLabel = reportMode.charAt(0).toUpperCase() + reportMode.slice(1);

  // ── PDF header ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${modeLabel.toUpperCase()} REPORT SUMMARY`, 105, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 28;

  const lines = [
    `View Mode    : ${viewMode === "all users" ? "All Users" : "Own"}`,
    `Report Type  : ${reportResult.report.report_type.charAt(0).toUpperCase() + reportResult.report.report_type.slice(1)}`,
    `Date Range   : ${fmtDate(reportResult.report.start_date)} to ${fmtDate(reportResult.report.end_date)}`,
    `Generated At : ${fmtDate(reportResult.report.created_at)}`,
    `Currency     : PHP`,
    `Total Entries: ${totalEntries}`,
  ];
  lines.forEach(line => { doc.text(line, 14, y); y += 6; });
  y += 4;

  // ── Color constants ───────────────────────────────────────────────────────
  const DARK   : [number,number,number] = [45,  45,  45];
  const MID    : [number,number,number] = [90,  90,  90];
  const LIGHT  : [number,number,number] = [220, 220, 220];
  const GREEN  : [number,number,number] = [30,  150, 100];
  const RED    : [number,number,number] = [190, 50,  50];
  const DKGREEN: [number,number,number] = [14,  100, 65];
  const DKRED  : [number,number,number] = [150, 25,  25];
  const WHITE  : [number,number,number] = [255, 255, 255];
  const NEAR_BLACK: [number,number,number] = [40,  40,  40];

  // ── Build table rows ──────────────────────────────────────────────────────
  const tableBody: any[] = [];

  Object.entries(grouped).forEach(([periodKey, items]) => {
    const periodEntries = items.reduce((a, i) => a + (i.entry_count ?? 1), 0);
    const incomeItems   = items.filter(i => i.transaction_type === "Income");
    const expenseItems  = items.filter(i => i.transaction_type === "Expense");

    // Period header row (weekly / daily only)
    if (isMultiPeriod) {
      tableBody.push([{
        content: `${periodKey}   (${periodEntries} ${periodEntries === 1 ? "entry" : "entries"})`,
        colSpan: 2,
        styles: {
          halign: "left", fontStyle: "bold", fontSize: 9,
          fillColor: MID, textColor: WHITE,
          cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        },
      }]);
    }

    // Income rows
    if (incomeItems.length > 0) {
      // Sub-label only if combined report (both types present in same period)
      if (expenseItems.length > 0 || reportMode === "combined") {
        tableBody.push([{
          content: `  INCOME`,
          colSpan: 2,
          styles: { halign: "left", fontStyle: "italic", fontSize: 8, fillColor: LIGHT, textColor: NEAR_BLACK },
        }]);
      }
      incomeItems.forEach(i => {
        const tag = i.entry_count && i.entry_count > 1 ? ` x${i.entry_count}` : "";
        tableBody.push([
          { content: `  ${i.category_name}${tag}`, styles: { halign: "left" } },
          { content: `+${peso(cleanNumber(i.total_amount))}`, styles: { halign: "right", textColor: GREEN } },
        ]);
      });
    }

    // Expense rows
    if (expenseItems.length > 0) {
      if (incomeItems.length > 0 || reportMode === "combined") {
        tableBody.push([{
          content: `  EXPENSE`,
          colSpan: 2,
          styles: { halign: "left", fontStyle: "italic", fontSize: 8, fillColor: LIGHT, textColor: NEAR_BLACK },
        }]);
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

  // ── Grand total rows — only once at the bottom ────────────────────────────
  if (grandIncome > 0) {
    tableBody.push([
      { content: "Total Income", styles: { halign: "left", fontStyle: "bold", fillColor: LIGHT } },
      { content: `+${peso(grandIncome)}`, styles: { halign: "right", fontStyle: "bold", fillColor: LIGHT, textColor: DKGREEN } },
    ]);
  }
  if (grandExpense > 0) {
    tableBody.push([
      { content: "Total Expense", styles: { halign: "left", fontStyle: "bold", fillColor: LIGHT } },
      { content: `-${peso(grandExpense)}`, styles: { halign: "right", fontStyle: "bold", fillColor: LIGHT, textColor: DKRED } },
    ]);
  }

  // ── Render table ──────────────────────────────────────────────────────────
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

  // ── Net Result line ───────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 10;

  doc.setDrawColor(160, 160, 160);
  doc.line(14, finalY + 5, 196, finalY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("NET RESULT", 14, finalY + 13);

  const netSign = grandNet >= 0 ? "+" : "-";
  doc.setTextColor(...(grandNet >= 0 ? DKGREEN : DKRED));
  doc.text(`${netSign}${peso(Math.abs(grandNet))}`, 196, finalY + 13, { align: "right" });

  doc.setTextColor(0, 0, 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const now      = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const timePart = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  doc.save(`${modeLabel}_Report_${datePart}_${timePart}.pdf`);
}