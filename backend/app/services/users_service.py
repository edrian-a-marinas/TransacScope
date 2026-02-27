from db.connection import get_pool
from app.schemas.users import UserBase
import logging

logger = logging.getLogger(__name__)

SUPER_ADMIN_ID = 1  # Only this user can demote other admins


async def get_user_by_id(user_id: int):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching user by id: {user_id}")
    raise


async def get_user_by_email(email: str):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow("SELECT * FROM users WHERE email=$1", email)
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching user by email: {email}")
    raise
  

async def update_user_role(user_id: int, new_role_id: int, current_user_id: int, current_user_role: str):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        target_user = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
        if not target_user:
          return None

        # Super admin can promote/demote anyone
        if current_user_id == SUPER_ADMIN_ID:
          row = await conn.fetchrow(
            """
            UPDATE users
            SET role_id=$1
            WHERE id=$2
            RETURNING id, email, first_name, middle_name, last_name, phone_number,
                      role_id, is_active, created_at
            """,
            new_role_id, user_id
          )
          return dict(row) if row else None

        # Only admins can continue
        if current_user_role != "admin":
          return None

        # Admins can only act on standard users
        if target_user["role_id"] != 2:
          return None  # can't change other admins or super admin

        # Admins can promote standard user to admin (role_id=1) or keep as standard (role_id=2)
        if new_role_id not in [1, 2]:
          return None  # invalid role

        row = await conn.fetchrow(
          """
          UPDATE users
          SET role_id=$1
          WHERE id=$2
          RETURNING id, email, first_name, middle_name, last_name, phone_number,
                    role_id, is_active, created_at
          """,
          new_role_id, user_id
        )
        return dict(row) if row else None

  except Exception:
    logger.exception(f"Error updating user role for user_id: {user_id}")
    raise

async def update_user_active(user_id: int, is_active: bool, current_user_id: int, current_user_role: str):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

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

  except Exception:
    logger.exception(f"Error updating active status for user_id: {user_id}")
    raise


async def soft_delete_user(user_id: int, current_user_id: int, current_user_role: str):
  if user_id == SUPER_ADMIN_ID:
    return None  # Can't soft-delete super admin

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

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

  except Exception:
    logger.exception(f"Error soft deleting user_id: {user_id}")
    raise


async def hard_delete_user(user_id: int, current_user_id: int):
  # Only super admin or the user themselves can delete
  if user_id == SUPER_ADMIN_ID or user_id != current_user_id:
    return None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        await conn.execute("DELETE FROM users WHERE id=$1", user_id)
        return True

  except Exception:
    logger.exception(f"Error hard deleting user_id: {user_id}")
    raise


async def get_all_users():

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT 
            u.id,
            u.email,
            u.role_id,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.phone_number,
            u.is_active,
            u.created_at,
            COUNT(t.id) AS transaction_count
        FROM users u
        LEFT JOIN transactions t 
            ON t.user_id = u.id 
            AND t.deleted_at IS NULL
        GROUP BY u.id
        ORDER BY transaction_count DESC
        """
      )
      return [dict(row) for row in rows]

  except Exception:
    logger.exception("Error fetching all users")
    raise


async def update_self_info(user_id: int, payload: UserBase):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        row = await conn.fetchrow(
          """
          UPDATE users
          SET first_name=$1, middle_name=$2, last_name=$3, phone_number=$4
          WHERE id=$5
          RETURNING id, email, role_id, first_name, middle_name, last_name,
                    phone_number, is_active, created_at
          """,
          payload.first_name,
          payload.middle_name,
          payload.last_name,
          payload.phone_number,
          user_id
        )
        return dict(row)

  except Exception:
    logger.exception(f"Error updating self info for user_id: {user_id}")
    raise

