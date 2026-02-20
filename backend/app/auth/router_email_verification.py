from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db.connection import get_pool
from datetime import datetime, timedelta
import random
import aiosmtplib
from email.message import EmailMessage
from email.utils import formataddr
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

DISPLAY_NAME = "TransacScope"

async def send_email(to_email: str, subject: str, body: str):
  message = EmailMessage()
  message["From"] = formataddr((DISPLAY_NAME, SMTP_USER)) # type: ignore
  message["To"] = to_email
  message["Subject"] = subject
  message.set_content(body, subtype="html")

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
  subject = "Verify Your Email"
  formatted_code = f"{code[:3]} {code[3:]}"
  body = create_body_html(formatted_code)

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


def create_body_html(formatted_code):
  body = f"""
<html>
  <body style="font-family: Arial, sans-serif; line-height:1.5; color: #111827; background-color: #F3F4F6; padding: 40px 0;">

    <div style="max-width: 600px; margin: 0 auto; text-align: center; background-color: #FFFFFF; padding: 40px 20px; border-radius: 8px;">
      <img src="../../../frontend/src/assets/vite.svg" alt="TransacScope Logo" width="50"/>

      <h2 style="color: #1D4ED8; margin-top: 10px;">Verify Your Email</h2>

      <div style="margin: 20px 0;">
        <p>Use the following OTP to complete <br> 
          your verification. <b>Valid for 5 minutes.</b></p>

        <p style="
          font-size: 32px;          
          font-weight: bold; 
          text-align: center; 
          color: #1D4ED8; 
          background-color: #E0F2FF;   
          display: inline-block;        
          padding: 15px 50px;           
          border-radius: 6px;           
          letter-spacing: 6px;           
        ">
          {formatted_code}
        </p>

        <p style="color: #6B7280; margin-top: 15px;">Do not share this OTP with anyone.<br>If you didn't request this, ignore this email.</p>
      </div>

      <p style="color: #A1A1A1; font-size: 12px; margin-top: 20px;">
        © 2026 TransacScope, All rights reserved.
      </p>
    </div>
  </body>
</html>
"""
  return body