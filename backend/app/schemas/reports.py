from pydantic import BaseModel, model_validator
from datetime import date, datetime
from typing import Literal, List, Optional

class ReportBase(BaseModel):
  report_type: Literal["daily", "weekly", "monthly"]
  start_date: date
  end_date: date

  @model_validator(mode="after")
  def validate_dates(self):
    if self.start_date > self.end_date:
      raise ValueError("start_date must be before or equal to end_date")
    return self


class ReportCreate(ReportBase):
  pass


class ReportRead(ReportBase):
  id: int
  generated_by: int
  created_at: datetime


class ReportSummaryItem(BaseModel):
  category_name: str
  total_amount: float
  date: Optional[str] = None
  week_start: Optional[str] = None
  week_end: Optional[str] = None


class ReportResult(BaseModel):
  report: ReportRead
  summary: List[ReportSummaryItem]




