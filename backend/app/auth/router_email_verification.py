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


SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 465
SMTP_USER     = os.getenv("SMTP_USER")
SMTP_PASS     = os.getenv("SMTP_PASS")
DISPLAY_NAME  = "TransacScope"

MAX_SENDS        = 3
SEND_WINDOW_MINS = 10


async def send_email(to_email: str, subject: str, body: str) -> None:
  message = EmailMessage()
  message["From"] = formataddr((DISPLAY_NAME, SMTP_USER))  # type: ignore
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
  except Exception as e:
    print(f"SMTP ERROR: {e}")
    raise HTTPException(status_code=500, detail="Failed to send email")


def build_otp_email(code: str) -> tuple[str, str]:
  subject = "Verify Your Email"
  formatted_code = f"{code[:3]} {code[3:]}"
  body = create_body_html(formatted_code)
  return subject, body


@router.post("/send-code")
async def send_code(data: EmailSchema):
  pool = await get_pool()

  async with pool.acquire() as conn:
    recent_count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM email_verifications
      WHERE email = $1
        AND created_at >= NOW() - INTERVAL '10 minutes'
      """,
      data.email,
    )
    if recent_count >= MAX_SENDS:
      raise HTTPException(
        status_code=429,
        detail=f"Too many verification attempts. Please wait {SEND_WINDOW_MINS} minutes before trying again.",
      )

  code = f"{random.randint(0, 999999):06d}"
  expires_at = datetime.utcnow() + timedelta(minutes=5)
  hashed_code = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()

  # DB write — keep old rows so the COUNT above stays accurate within the window
  async with pool.acquire() as conn:
    async with conn.transaction():
      await conn.execute(
        """
        INSERT INTO email_verifications (email, code, expires_at)
        VALUES ($1, $2, $3)
        """,
        data.email,
        hashed_code,
        expires_at,
      )

  # Email send OUTSIDE transaction — failure correctly returns 500
  subject, body = build_otp_email(code)
  await send_email(data.email, subject, body)

  return {"detail": "If this email exists, a verification code has been sent."}


def create_body_html(formatted_code: str) -> str:
  body = f"""
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#0e1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#161b26; border:1px solid #1f2937; border-radius:12px; padding:40px 36px;">

            <!-- Header -->
            <tr>
              <td style="padding-bottom:24px; border-bottom:1px solid #1f2937;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:10px; vertical-align:middle;">
                      <img src="https://transacscope.vercel.app/transacScope1.png" width="490" height="80" style="border-radius:8px; display:block;" alt="TransacScope" />
                    </td>
                    <td style="vertical-align:middle;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding-top:28px; padding-bottom:28px; text-align:center;">
                <p style="margin:0 0 8px 0; font-size:20px; font-weight:700; color:#e8eaf0; letter-spacing:-0.02em;">
                  Verify your email
                </p>
                <p style="margin:0 0 28px 0; font-size:13px; color:#c9cdd6; line-height:1.6;">
                  Use the code below to complete your registration.<br>
                  It expires in <strong style="color:#e8eaf0;">5 minutes</strong>.
                </p>

                <!-- OTP Code -->
                <div style="background-color:#1a2234; border:1px solid #1f2d45; border-radius:8px; padding:20px; text-align:center; margin-bottom:28px;">
                  <p style="margin:0 0 6px 0; font-size:10px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:#6b7280;">
                    Your verification code
                  </p>
                  <p style="margin:0; font-size:32px; font-weight:700; letter-spacing:0.25em; color:#22d3ee; font-family:'Courier New', monospace; white-space:nowrap;">
                    {formatted_code}
                  </p>
                </div>

                <!-- Do not share — faded -->
                <p style="margin:0; font-size:12px; color:#4b5563; line-height:1.6;">
                  Do not share this code with anyone.<br>
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding-top:24px; border-top:1px solid #1f2937; text-align:center;">
                <p style="margin:0; font-size:11px; color:#6b7280;">
                  © 2026 TransacScope. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""
  return body