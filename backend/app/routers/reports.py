from fastapi import APIRouter, HTTPException, Depends
from typing import Tuple
from app.auth.format_role import get_user_id_and_role
from app.services import reports_service
from app.schemas.reports import ReportCreate, ReportResult

router = APIRouter(prefix="/api/reports")


@router.post("/", response_model=ReportResult)
async def generate_report(payload: ReportCreate, user_data: Tuple[int, str] = Depends(get_user_id_and_role)):
    
  CURRENT_USER_ID, role = user_data

  result = await reports_service.generate_report(payload, CURRENT_USER_ID, role)
  if not result:
    raise HTTPException(status_code=400, detail="Report generation failed")

  return result
