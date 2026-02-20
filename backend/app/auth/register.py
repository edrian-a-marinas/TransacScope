from db.connection import get_pool
from app.schemas.users import UserCreate
from fastapi import HTTPException
import asyncpg
from datetime import datetime
import bcrypt


# ────────── OTP VERIFICATION ──────────
async def verify_otp(email: str, code: str, conn):
  query = """
  SELECT id, code, expires_at, is_used
  FROM email_verifications
  WHERE email = $1
  ORDER BY id DESC
  LIMIT 1;
  """
  verification = await conn.fetchrow(query, email)

  if not verification:
    raise HTTPException(status_code=400, detail="Invalid verification code.")

  if not bcrypt.checkpw(code.encode(), verification["code"].encode()):
    raise HTTPException(status_code=400, detail="Invalid verification code.")

  if verification["is_used"]:
    raise HTTPException(status_code=400, detail="Verification code already used.")

  if verification["expires_at"] < datetime.utcnow():
    raise HTTPException(status_code=400, detail="Verification code expired.")

  return verification


# ────────── INSERT NEW USER ──────────
async def insert_user(user: UserCreate, conn):
  query = """
  INSERT INTO users (
      email,
      password_hash,
      first_name,
      middle_name,
      last_name,
      phone_number,
      role_id
  )
  VALUES (
      $1,
      crypt($2, gen_salt('bf')),
      $3, $4, $5, $6,
      2
  )
  RETURNING
      id,
      email,
      first_name,
      middle_name,
      last_name,
      phone_number,
      role_id,
      is_active,
      created_at,
      request_admin;
  """
  values = (
      user.email,
      user.password,
      user.first_name,
      user.middle_name,
      user.last_name,
      user.phone_number
  )
  row = await conn.fetchrow(query, *values)
  return dict(row) if row else None


# ────────── MARK OTP AS USED ──────────
async def mark_otp_used(otp_id: int, conn):
  query = """
  UPDATE email_verifications
  SET is_used = TRUE
  WHERE id = $1;
  """
  await conn.execute(query, otp_id)

# ────────── MAIN CREATE USER FUNCTION ──────────
async def create_user(user: UserCreate):
  pool = await get_pool()

  try:
    async with pool.acquire() as conn:
      async with conn.transaction():
        # 1️⃣ Verify OTP
        verification = await verify_otp(user.email, user.verification_code, conn)

        # 2️⃣ Insert user
        user_row = await insert_user(user, conn)

        # 3️⃣ Mark OTP as used
        await mark_otp_used(verification["id"], conn)

        return user_row

  except asyncpg.exceptions.UniqueViolationError:
    raise HTTPException(status_code=400, detail="Email already registered.")
  except HTTPException:
    raise
  except Exception:
    raise HTTPException(status_code=500, detail="Internal server error.")
