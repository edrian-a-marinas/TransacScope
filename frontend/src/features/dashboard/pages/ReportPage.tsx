// ReportPage.tsx
import { useState, useContext } from "react";
import { FileText, TrendingUp, TrendingDown, BarChart2, HelpCircle } from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";
import { GenerateReport } from "@/features/dashboard/components/modals";
import type { ReportMode } from "@/features/dashboard/schemas/report";

// ── Same tokens as TransactionPage / DashboardPage ────────────────────────────
const C = {
  primary:  "hsl(199,89%,38%)",
  income:   "hsl(160,60%,45%)",
  expense:  "hsl(0,72%,51%)",
  muted:    "hsl(220,10%,46%)",
  surface:  "hsl(220,14%,96%)",
  border:   "hsl(220,13%,89%)",
  fg:       "hsl(220,14%,15%)",
  fgLight:  "hsl(220,10%,46%)",
};

interface ReportCard {
  mode:        ReportMode;
  label:       string;
  description: string;
  icon:        typeof FileText;
  color:       string;
  bgColor:     string;
}

const reportCards: ReportCard[] = [
  {
    mode:        "income",
    label:       "Income Report",
    description: "View all income transactions, category breakdown, and revenue trends",
    icon:        TrendingUp,
    color:       C.income,
    bgColor:     "hsl(160 60% 45% / 0.08)",
  },
  {
    mode:        "expense",
    label:       "Expense Report",
    description: "Analyze spending by category, track costs, and identify top expenses",
    icon:        TrendingDown,
    color:       C.expense,
    bgColor:     "hsl(0 72% 51% / 0.08)",
  },
  {
    mode:        "combined",
    label:       "Combined Report",
    description: "Full financial summary with net profit, margins, and side-by-side comparison",
    icon:        BarChart2,
    color:       C.primary,
    bgColor:     "hsl(199 89% 38% / 0.08)",
  },
];

// ── Tooltip content ───────────────────────────────────────────────────────────
const TOOLTIP_LINES = [
  "Select a report type, set a date range,",
  "and choose daily, weekly, or monthly grouping.",
  "Results can be downloaded as a PDF.",
  "",
  "• Income — revenue by category",
  "• Expense — spending breakdown",
  "• Combined — net profit & full summary",
];

// ── Tooltip component ─────────────────────────────────────────────────────────
function InfoTooltip() {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          background:  "transparent",
          border:      "none",
          padding:     "0.15rem",
          cursor:      "default",
          display:     "flex",
          alignItems:  "center",
          color:       C.muted,
          lineHeight:  1,
        }}
        aria-label="Report help"
        tabIndex={0}
      >
        <HelpCircle style={{ width: "0.85rem", height: "0.85rem" }} />
      </button>

      {visible && (
        <div style={{
          position:     "absolute",
          left:         "calc(100% + 8px)",
          top:          "50%",
          transform:    "translateY(-50%)",
          zIndex:       50,
          background:   "hsl(220,20%,12%)",
          border:       "1px solid hsl(220,16%,22%)",
          borderRadius: "0.55rem",
          padding:      "0.65rem 0.875rem",
          minWidth:     "230px",
          boxShadow:    "0 8px 24px rgba(0,0,0,0.35)",
          pointerEvents:"none",
        }}>
          {/* Arrow pointing left */}
          <div style={{
            position:    "absolute",
            left:        "-5px",
            top:         "50%",
            transform:   "translateY(-50%)",
            width:       0,
            height:      0,
            borderTop:   "5px solid transparent",
            borderBottom:"5px solid transparent",
            borderRight: "5px solid hsl(220,16%,22%)",
          }} />
          {TOOLTIP_LINES.map((line, i) =>
            line === "" ? (
              <div key={i} style={{ height: "0.4rem" }} />
            ) : (
              <p key={i} style={{
                fontSize:   "0.72rem",
                color:      line.startsWith("•") ? "hsl(220,14%,80%)" : "hsl(220,10%,60%)",
                margin:     0,
                lineHeight: 1.6,
                fontWeight: line.startsWith("•") ? 500 : 400,
              }}>
                {line}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const userRole = user!.role_id;
  const isAdmin  = userRole === 1;

  const [activeMode,  setActiveMode]  = useState<ReportMode | null>(null);
  const [hoveredCard, setHoveredCard] = useState<ReportMode | null>(null);

  return (
    <>
      <title>Reports</title>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.fg }}>
              Reports
            </h1>
            {/* ── Tooltip — sits right of the title, small and unobtrusive ── */}
            <InfoTooltip />
          </div>
          <p className="text-sm" style={{ color: C.fgLight }}>
            {isAdmin
              ? "Generate financial reports across all users"
              : "Generate your personal financial reports"}
          </p>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((card) => {
            const Icon    = card.icon;
            const hovered = hoveredCard === card.mode;
            return (
              <button
                key={card.mode}
                onClick={() => setActiveMode(card.mode)}
                onMouseEnter={() => setHoveredCard(card.mode)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background:    "hsl(0,0%,100%)",
                  border:        `1px solid ${hovered ? card.color : C.border}`,
                  borderRadius:  "0.75rem",
                  padding:       "1.25rem 1.5rem",
                  cursor:        "pointer",
                  textAlign:     "left",
                  transition:    "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
                  boxShadow:     hovered
                    ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${card.color}1a`
                    : "0 1px 3px hsl(0 0% 0% / 0.06)",
                  transform:     hovered ? "translateY(-2px)" : "none",
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "0.75rem",
                }}
              >
                {/* Icon badge */}
                <div style={{
                  width:           "2.5rem",
                  height:          "2.5rem",
                  borderRadius:    "0.5rem",
                  backgroundColor: hovered ? card.color : card.bgColor,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  transition:      "background-color 0.15s",
                  flexShrink:      0,
                }}>
                  <Icon style={{
                    width:      "1.1rem",
                    height:     "1.1rem",
                    color:      hovered ? "hsl(0,0%,100%)" : card.color,
                    transition: "color 0.15s",
                  }} />
                </div>
                {/* Text */}
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.fg, marginBottom: "0.2rem" }}>
                    {card.label}
                  </p>
                  <p className="text-xs" style={{ color: C.fgLight, lineHeight: "1.4" }}>
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {activeMode && (
        <GenerateReport
          reportMode={activeMode}
          onClose={() => setActiveMode(null)}
        />
      )}
    </>
  );
}