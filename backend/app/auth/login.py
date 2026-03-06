from db.connection import get_pool
from fastapi import HTTPException
from datetime import datetime, timedelta

# ── Rate limit config ─────────────────────────────────────────────────────────
MAX_ATTEMPTS     = 5   # max failed attempts before lockout
LOCKOUT_MINUTES  = 3   # lockout window in minutes
WINDOW_MINUTES   = 3   # rolling window to count attempts in


# ── Log a failed attempt ──────────────────────────────────────────────────────
async def record_failed_attempt(email: str, ip: str | None, conn):
  await conn.execute(
    """
    INSERT INTO login_attempts (email, ip_address, attempted_at)
    VALUES ($1, $2, NOW())
    """,
    email, ip
  )


# ── Count recent failed attempts (by email OR ip) ─────────────────────────────
async def count_recent_attempts(email: str, ip: str | None, conn) -> int:
  if ip:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE (email = $1 OR ip_address = $2)
        AND attempted_at >= NOW() - INTERVAL '2 minutes 55 seconds'
      """,
      email, ip
    )
  else:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE email = $1
        AND attempted_at >= NOW() - INTERVAL '2 minutes 55 seconds'
      """,
      email
    )
  return count or 0


# ── Clear attempts on successful login ────────────────────────────────────────
async def clear_attempts(email: str, conn):
  await conn.execute(
    "DELETE FROM login_attempts WHERE email = $1",
    email
  )


# ── Purge old rows to keep the table clean ───────────────────────────────────
async def purge_old_attempts(conn):
  await conn.execute(
    "DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour'"
  )


# ── Main verify function ──────────────────────────────────────────────────────
async def verify_user(email: str, password: str, ip: str | None = None):
  pool = await get_pool()

  async with pool.acquire() as conn:

    # 0️⃣ Purge stale rows (older than 1 hour) on every request
    await purge_old_attempts(conn)

    # 1️⃣ Check rate limit BEFORE touching credentials
    recent = await count_recent_attempts(email, ip, conn)
    if recent >= MAX_ATTEMPTS:
      raise HTTPException(
        status_code=429,
        detail=f"Too many failed login attempts. Please wait {LOCKOUT_MINUTES} minutes before trying again."
      )

    # 2️⃣ Check if user exists and is active
    row = await conn.fetchrow(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      email
    )

    if not row:
      # Record attempt even for non-existent emails (prevents user enumeration timing attack)
      await record_failed_attempt(email, ip, conn)
      return None

    user = dict(row)

    # 3️⃣ Verify password
    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id = $2",
      password, user["id"]
    )

    if not pw_check:
      await record_failed_attempt(email, ip, conn)
      return None

    # 4️⃣ Success — clear attempt history for this email
    await clear_attempts(email, conn)
    return user