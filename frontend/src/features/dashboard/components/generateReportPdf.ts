import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GeneratePDFProps } from "../schemas/report";

export function generateReportPDF({ reportResult, reportMode, viewMode }: GeneratePDFProps) {
  if (!reportResult) return;

  const doc = new jsPDF();

  // ---------------- FORCE CLEAN NUMBER ----------------
  const cleanNumber = (value: any): number => {
    if (typeof value === "number") return value;

    // remove EVERYTHING except digits, minus, and decimal
    const cleaned = String(value).replace(/[^0-9.-]/g, "");
    return Number(cleaned) || 0;
  };

  const peso = (value: number) => {
    const abs = Math.abs(value);
    const parts = abs.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return "PHP " + parts.join(".");
  };

  const simpleDate = (dateString: string) => {
    const d = new Date(dateString);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';  // Handle AM/PM
    
    return `${year}-${month}-${day} ${hours}:${minutes} ${ampm} (UTC+8)`;
  };

  // ---------------- HEADER ----------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`${reportMode.toUpperCase()} REPORT SUMMARY`, 105, 18, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  let y = 28;

  doc.text(
    `View Mode: ${viewMode === "all users" ? "All Users" : "Own"}`,
    20,
    y
  );
  y += 7;

  doc.text(`Report Type: ${reportResult.report.report_type}`, 20, y);
  y += 7;

  doc.text(
    "Date Range: " +
      simpleDate(reportResult.report.start_date) +
      " to " +
      simpleDate(reportResult.report.end_date),
    20,
    y,
    { align: "left" }
  );

  y += 7;

  doc.text(
    `Generated At: ${simpleDate(reportResult.report.created_at).replace("PM", "").trim()}`,
    20,
    y
  );

  // ---------------- TABLE ----------------
  const tableData = reportResult.summary.map((item) => {
    const amount = cleanNumber(item.total_amount);

    return [
      item.category_name +
        (item.entry_count && item.entry_count > 1
          ? ` (${item.entry_count})`
          : ""),
      peso(amount),
    ];
  });

  autoTable(doc, {
    startY: y + 10,
    head: [["Category", "Amount"]],
    body: tableData,
    styles: {
      fontSize: 11,
      cellPadding: 5,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { halign: "right", cellWidth: 50 },
    },
    margin: { left: 20, right: 20 },

    // 🔥 THIS IS THE IMPORTANT PART
    didParseCell: function (data) {
      if (data.column.index === 1 && data.cell.raw) {
        // Force remove ANY ± if still present
        data.cell.text = [
          String(data.cell.raw).replace(/±/g, "")
        ];
      }
    },
  });

  // ---------------- TOTAL ----------------
  const rawTotal = reportResult.summary.reduce((acc, item) => {
    const amount = cleanNumber(item.total_amount);

    if (item.transaction_type === "Income") {
      return acc + amount;
    }
    if (item.transaction_type === "Expense") {
      return acc - amount;
    }
    return acc;
  }, 0);

  let finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;

  if (finalY + 20 > 280) {
    doc.addPage();
    finalY = 20;
  }

  const sign = rawTotal > 0 ? "+" : (rawTotal < 0 ? "-" : "");

  const formattedTotal = peso(Math.abs(rawTotal)).replace('PHP ', ''); 

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);

  // Here we ensure that the sign is applied correctly to the amount
  doc.text(
    `PHP ${sign}${formattedTotal} (Total Overall)`,
    105,
    finalY + 15,
    { align: "center" }
  );

  // ---------------- SAVE ----------------
  const now = new Date();

  const datePart =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const timePart =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");

  const reportTypeName =
    reportMode.charAt(0).toUpperCase() + reportMode.slice(1);

  const fileName = `${reportTypeName}_Report_${datePart}_${timePart}.pdf`;

  doc.save(fileName);
}