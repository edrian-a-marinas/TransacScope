from db.connection import get_pool
from app.schemas.users import UserBase, UserCreate

SUPER_ADMIN_ID = 1  # Only this user can demote other admins

async def verify_user(email: str, password: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    # Only fetch active users
    row = await conn.fetchrow(
      "SELECT * FROM users WHERE email=$1 AND is_active=true",
      email
    )
    if not row:
      return None

    user = dict(row)
    # Verify password using Postgres crypt function
    pw_check = await conn.fetchval(
      "SELECT crypt($1, password_hash) = password_hash FROM users WHERE id=$2",
      password, user["id"]
    )
    if not pw_check:
      return None

    return user

async def get_user_by_id(user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
    return dict(row) if row else None

async def get_user_by_email(email: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow("SELECT * FROM users WHERE email=$1", email)
    return dict(row) if row else None

async def create_user(user: UserCreate):
  pool = await get_pool()
  async with pool.acquire() as conn:
    query = """
    INSERT INTO users (email, password_hash, first_name, middle_name, last_name, phone_number, role_id)
    VALUES (
      $1,
      crypt($2, gen_salt('bf')),
      $3, $4, $5, $6,
      2
    )
    RETURNING id, email, first_name, middle_name, last_name, phone_number, role_id, is_active, created_at, request_admin;
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


async def update_user_role(user_id: int, new_role_id: int, current_user_id: int, current_user_role: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    target_user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
    if not target_user:
      return None

    # Super admin can promote/demote anyone
    if current_user_id == SUPER_ADMIN_ID:
      row = await conn.fetchrow(
        """
        UPDATE users
        SET role_id=$1, request_admin=false
        WHERE id=$2
        RETURNING id, email, first_name, middle_name, last_name, phone_number,
                  role_id, is_active, created_at, request_admin
        """,
        new_role_id, user_id
      )
      return dict(row) if row else None

    # Only admins can continue
    if current_user_role != "admin":
      return None

    # Admin cannot demote/promote other admins
    if target_user["role_id"] != 2 or new_role_id != 2:
      return None

    row = await conn.fetchrow(
      """
      UPDATE users
      SET role_id=$1, request_admin=false
      WHERE id=$2
      RETURNING id, email, first_name, middle_name, last_name, phone_number,
                role_id, is_active, created_at, request_admin
      """,
      new_role_id, user_id
    )
    return dict(row) if row else None


async def update_user_active(user_id: int, is_active: bool, current_user_id: int, current_user_role: str):
  pool = await get_pool()
  async with pool.acquire() as conn:
    target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
    if not target_user:
      return None

    # Super admin can change any user's is_active
    if current_user_id == SUPER_ADMIN_ID:
      row = await conn.fetchrow(
        "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, email, is_active",
        is_active, user_id
      )
      return dict(row) if row else None

    # Admin rules
    if current_user_role != "admin":
      return None
    # Admin cannot change other admins or super admin
    if target_user["role_id"] != 2:
      return None

    row = await conn.fetchrow(
      "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, email, is_active",
      is_active, user_id
    )
    return dict(row) if row else None

async def soft_delete_user(user_id: int, current_user_id: int, current_user_role: str):
  if user_id == SUPER_ADMIN_ID:
    return None  # Can't soft-delete super admin

  pool = await get_pool()
  async with pool.acquire() as conn:
    target_user = await conn.fetchrow("SELECT id, role_id FROM users WHERE id=$1", user_id)
    if not target_user:
      return None

    # Admins cannot soft-delete other admins
    if current_user_role != "admin":
      return None
    if target_user["role_id"] != 2:
      return None

    await conn.execute("UPDATE users SET is_active=false WHERE id=$1", user_id)
    return True

async def hard_delete_user(user_id: int, current_user_id: int):
  # Only super admin or the user themselves can delete
  if user_id == SUPER_ADMIN_ID or user_id != current_user_id:
    return None

  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute("DELETE FROM users WHERE id=$1", user_id)
    return True

async def get_all_users(current_user_role: str):
  if current_user_role not in ["admin", "superadmin"]:
    return []

  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT id, email, role_id, first_name, middle_name, last_name,
             phone_number, is_active, created_at, request_admin
      FROM users
      ORDER BY created_at DESC
      """
    )
    return [dict(row) for row in rows]

async def update_self_info(user_id: int, payload: UserBase):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      UPDATE users
      SET first_name=$1, middle_name=$2, last_name=$3, phone_number=$4
      WHERE id=$5
      RETURNING id, email, role_id, first_name, middle_name, last_name,
                phone_number, is_active, created_at, request_admin
      """,
      payload.first_name,
      payload.middle_name,
      payload.last_name,
      payload.phone_number,
      user_id
    )
    return dict(row)


async def request_admin(user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    await conn.execute("UPDATE users SET request_admin=true WHERE id=$1", user_id)
    return True
