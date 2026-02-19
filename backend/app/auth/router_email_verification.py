from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db.connection import get_pool
from datetime import datetime, timedelta
import random
import aiosmtplib
from email.message import EmailMessage
import os
import bcrypt
from dotenv import load_dotenv

router = APIRouter(prefix="/api/auth")

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

class EmailSchema(BaseModel):
  email: EmailStr

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

async def send_email(to_email: str, subject: str, body: str):
  message = EmailMessage()
  message["From"] = SMTP_USER
  message["To"] = to_email
  message["Subject"] = subject
  message.set_content(body)

  try:
    await aiosmtplib.send(
      message,
      hostname=SMTP_HOST,
      port=SMTP_PORT,
      start_tls=True,
      username=SMTP_USER,
      password=SMTP_PASS,
    )
  except Exception:
    raise HTTPException(status_code=500, detail="Failed to send email")

def build_otp_email(code: str) -> tuple[str, str]:
  subject = "Your OTP Code for TransacScope"
  formatted_code = " ".join(code)

  body = f"""
Hi,

Use the following OTP to complete your verification. Valid for 5 minutes.

[ {formatted_code} ]

Do not share this OTP with anyone.
If you did not request this, you can ignore this email.

© 2025 TransacScope, All rights reserved.
"""
  return subject, body

@router.post("/send-code")
async def send_code(data: EmailSchema):
  pool = await get_pool()

  code = f"{random.randint(0, 999999):06d}"
  expires_at = datetime.utcnow() + timedelta(minutes=5)
  hashed_code = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()

  async with pool.acquire() as conn:
    async with conn.transaction():
      await conn.execute(
        "DELETE FROM email_verifications WHERE email = $1",
        data.email
      )

      await conn.execute(
        """
        INSERT INTO email_verifications (email, code, expires_at)
        VALUES ($1, $2, $3)
        """,
        data.email,
        hashed_code,
        expires_at
      )

      subject, body = build_otp_email(code)

      try:
        await send_email(data.email, subject, body)
      except Exception:
        raise HTTPException(status_code=500, detail="Failed to send email")

  return {"detail": "If this email exists, a verification code has been sent."}

