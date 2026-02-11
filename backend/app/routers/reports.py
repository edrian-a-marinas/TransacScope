from fastapi import APIRouter, HTTPException
from app.auth import jwt
from app.services import reports_service
from app.schemas.reports import (
  ReportCreate,
  ReportResult
)

router = APIRouter(
  prefix="/reports",
)


@router.post("/", response_model=ReportResult)
async def generate_report(payload: ReportCreate):

  CURRENT_USER_ID = await jwt.get_logged_in_user_id()
  role = await jwt.get_user_role(CURRENT_USER_ID)

  result = await reports_service.generate_report(
    payload,
    CURRENT_USER_ID,
    role
  )

  if not result:
    raise HTTPException(status_code=400, detail="Report generation failed")

  return result
