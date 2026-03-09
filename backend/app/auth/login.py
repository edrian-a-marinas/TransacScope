from db.connection import get_pool
from fastapi import HTTPException

MAX_ATTEMPTS    = 5  # max failed attempts before lockout
LOCKOUT_MINUTES = 3  # lockout window in minutes
WINDOW_MINUTES  = 3  # rolling window to count attempts in


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
      raise HTTPException(
        status_code=429,
        detail=f"Too many failed login attempts. Please wait {LOCKOUT_MINUTES} minutes before trying again.",
      )

    # Look up user by email only — active OR inactive both allowed to authenticate.
    # is_active is checked in the router; deactivated users can still log in and self-delete.
    row = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)
    if not row:
      # Record attempt even for non-existent emails (prevents user enumeration)
      await record_failed_attempt(email, ip, conn)
      return None

    user = dict(row)

    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id = $2",
      password, user["id"],
    )
    if not pw_check:
      await record_failed_attempt(email, ip, conn)
      return None

    await clear_attempts(email, ip, conn)
    return user