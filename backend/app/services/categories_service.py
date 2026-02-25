from db.connection import get_pool
import json
import logging

logger = logging.getLogger(__name__)


# READ: all categories (global)
async def get_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * 
        FROM categories
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching categories")
    raise

async def expense_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * 
        FROM categories
        WHERE type = 'Expense'
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching categories")
    raise


async def income_categories():
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      rows = await conn.fetch(
        """
        SELECT * 
        FROM categories
        WHERE type = 'Income'
        """
      )
      return [dict(row) for row in rows]
  except Exception:
    logger.exception("Error fetching categories")
    raise 


# READ: single category
async def get_category_by_id(ctg_id: int):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow(
        """
        SELECT id, name, description, created_at
        FROM categories
        WHERE id = $1
        """,
        ctg_id
      )
      return dict(row) if row else None
  except Exception:
    logger.exception(f"Error fetching category by id: {ctg_id}")
    raise


# CREATE: admin only
async def create_category(ctg, current_user_id: int, role):

  if role != "admin":
    return None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        row = await conn.fetchrow(
          """
          INSERT INTO categories (name, description)
          VALUES ($1, $2)
          RETURNING id, name, description, created_at
          """,
          ctg.name,
          ctg.description
        )

        return dict(row) if row else None

  except Exception:
    logger.exception("Error creating category")
    raise


# UPDATE: admin only
async def update_category(ctg_id: int, ctg, current_user_id: int, role):

  if role != "admin":
    return None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        old = await conn.fetchrow(
          """
          SELECT *
          FROM categories
          WHERE id = $1
          """,
          ctg_id
        )

        if not old:
          return None

        updated = await conn.fetchrow(
          """
          UPDATE categories
          SET
            name = COALESCE($1, name),
            description = COALESCE($2, description)
          WHERE id = $3
          RETURNING id, name, description, created_at
          """,
          ctg.name,
          ctg.description,
          ctg_id
        )

        await conn.execute(
          """
          INSERT INTO log_history (
            entity_type,
            entity_id,
            user_id,
            action,
            old_data,
            new_data,
            action_taken_at
          )
          VALUES ('category', $1, $2, 'updated', $3::jsonb, $4::jsonb, now())
          """,
          ctg_id,
          current_user_id,
          json.dumps({
            "name": old["name"],
            "description": old["description"]
          }),
          json.dumps({
            "name": updated["name"],
            "description": updated["description"]
          })
        )

        return dict(updated)

  except Exception:
    logger.exception(f"Error updating category id: {ctg_id}")
    raise


# DELETE: admin only
async def delete_category(ctg_id: int, current_user_id: int, role):

  if role != "admin":
    return None

  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        old = await conn.fetchrow(
          """
          SELECT *
          FROM categories
          WHERE id = $1
          """,
          ctg_id
        )

        if not old:
          return None

        await conn.execute(
          """
          DELETE FROM categories
          WHERE id = $1
          """,
          ctg_id
        )

        await conn.execute(
          """
          INSERT INTO log_history (
            entity_type,
            entity_id,
            user_id,
            action,
            old_data,
            action_taken_at
          )
          VALUES ('category', $1, $2, 'deleted', $3::jsonb, now())
          """,
          ctg_id,
          current_user_id,
          json.dumps({
            "name": old["name"],
            "description": old["description"]
          })
        )

        return True

  except Exception:
    logger.exception(f"Error deleting category id: {ctg_id}")
    raise