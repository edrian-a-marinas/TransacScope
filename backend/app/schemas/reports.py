from pydantic import BaseModel
from datetime import date, datetime
from typing import Literal, List


class ReportBase(BaseModel):
  report_type: Literal["weekly", "monthly"]
  start_date: date
  end_date: date


class ReportCreate(ReportBase):
  pass


class ReportRead(ReportBase):
  id: int
  generated_by: int
  created_at: datetime


class ReportSummaryItem(BaseModel):
  category_name: str
  total_amount: float


class ReportResult(BaseModel):
  report: ReportRead
  summary: List[ReportSummaryItem]
