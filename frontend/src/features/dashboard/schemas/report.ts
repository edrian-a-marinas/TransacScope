export type ReportType = "weekly" | "monthly";

type ReportSummaryItem = {
  category_name: string;
  total_amount: number;
  week_start?: string;
  week_end?: string;
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