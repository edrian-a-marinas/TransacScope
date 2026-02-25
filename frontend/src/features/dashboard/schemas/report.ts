export type ReportType = "daily" | "weekly" | "monthly";

type ReportSummaryItem = {
  category_name: string;
  total_amount: number;

  // weekly
  week_start?: string;
  week_end?: string;

  // daily
  date?: string;

  // monthly (future safe)
  month_start?: string;
  month_end?: string;
};


export type ReportResult = {
  report: {
    id: number;
    generated_by: number;
    report_type: ReportType;
    start_date: string;
    end_date: string;
    created_at: string;
  };
  summary: ReportSummaryItem[];
};