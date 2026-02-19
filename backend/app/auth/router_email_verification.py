from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from db.connection import get_pool
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/auth")

class EmailSchema(BaseModel):
  email: EmailStr

@router.post("/send-code")
async def send_code(data: EmailSchema):
  pool = await get_pool()
  code = f"{random.randint(0, 999999):06d}"  # 6-digit OTP
  expires_at = datetime.utcnow() + timedelta(minutes=5)

  async with pool.acquire() as conn:
    await conn.execute(
      """
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES ($1, $2, $3)
      """,
      data.email, code, expires_at
    )
    
  return {"detail": "Verification code sent"}
