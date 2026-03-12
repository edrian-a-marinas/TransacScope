from db.connection import get_pool
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

MAX_ATTEMPTS    = 5
LOCKOUT_MINUTES = 3
WINDOW_MINUTES  = 3

async def record_failed_attempt(email: str, ip: str | None, conn) -> None:
  await conn.execute(
    """
    INSERT INTO login_attempts (email, ip_address, attempted_at)
    VALUES ($1, $2, NOW())
    """,
    email, ip,
  )

async def count_recent_attempts(email: str, ip: str | None, conn) -> int:
  if ip:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE (email = $1 OR ip_address = $2)
        AND attempted_at >= NOW() - INTERVAL '2 minutes 55 seconds'
      """,
      email, ip,
    )
  else:
    count = await conn.fetchval(
      """
      SELECT COUNT(*) FROM login_attempts
      WHERE email = $1
        AND attempted_at >= NOW() - INTERVAL '2 minutes 55 seconds'
      """,
      email,
    )
  return count or 0

async def clear_attempts(email: str, ip: str | None, conn) -> None:
  if ip:
    await conn.execute(
      "DELETE FROM login_attempts WHERE email = $1 OR ip_address = $2",
      email, ip,
    )
  else:
    await conn.execute(
      "DELETE FROM login_attempts WHERE email = $1",
      email,
    )

async def purge_old_attempts(conn) -> None:
  await conn.execute(
    "DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour'"
  )

async def verify_user(email: str, password: str, ip: str | None = None) -> dict | None:
  pool = await get_pool()
  async with pool.acquire() as conn:
    await purge_old_attempts(conn)

    recent = await count_recent_attempts(email, ip, conn)
    if recent >= MAX_ATTEMPTS:
      logger.warning(f"[AUTH] Brute force blocked — email={email} ip={ip}")
      raise HTTPException(
        status_code=429,
        detail=f"Too many failed login attempts. Please wait {LOCKOUT_MINUTES} minutes before trying again.",
      )

    row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not row:
      logger.warning(f"[AUTH] Login failed — email not found: {email} ip={ip}")
      await record_failed_attempt(email, ip, conn)
      return None

    user = dict(row)
    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id = $2",
      password, user["id"],
    )
    if not pw_check:
      logger.warning(f"[AUTH] Login failed — wrong password: email={email} ip={ip}")
      await record_failed_attempt(email, ip, conn)
      return None

    await clear_attempts(email, ip, conn)
    logger.info(f"[AUTH] Login success — user_id={user['id']} email={email} ip={ip}")
    return user