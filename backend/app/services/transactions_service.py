# app/services/transactions_service.py

from db.connection import get_pool
from app.utils import helpers
import json
import logging

logger = logging.getLogger(__name__)


# READ: all transactions (optionally by user)
async def get_transactions(current_user_id: int, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:

      if role == 'admin' or role == 1:
        rows = await conn.fetch(
          """
          SELECT t.*, c.name AS category_name
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.deleted_at IS NULL
          ORDER BY t.created_at DESC
          """
        )

      else:
        rows = await conn.fetch(
          """
          SELECT t.*, c.name AS category_name
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = $1
            AND t.deleted_at IS NULL
          ORDER BY t.created_at DESC
          """,
          current_user_id
        )

      return [dict(row) for row in rows]

  except Exception as e:
    logger.exception("Error fetching transactions")
    raise

# READ: single transaction
async def get_transaction_by_id(tx_id: int, current_user_id: int, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:

      if role == "admin" or role == 1:
        row = await conn.fetchrow(
          """
          SELECT t.*, c.name AS category_name
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.id = $1
            AND t.deleted_at IS NULL
          """,
          tx_id
        )

      else:
        row = await conn.fetchrow(
          """
          SELECT t.*, c.name AS category_name
          FROM transactions t
          JOIN categories c ON t.category_id = c.id
          WHERE t.id = $1
            AND t.user_id = $2
            AND t.deleted_at IS NULL
          """,
          tx_id,
          current_user_id
        )

      return dict(row) if row else None

  except Exception:
    logger.exception(f"Error fetching transaction by id: {tx_id}")
    raise


async def get_transactions_history(current_user_id, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:

      if role == "admin" or role == 1:
        rows = await conn.fetch(
          """
          SELECT
              id,                          
              user_id,                     
              entity_id AS transac_id,     
              entity_type,
              action,
              to_char(action_taken_at, 'YYYY-MM-DD HH24:MI') AS action_taken_at,
              old_data->>'description' AS old_description,
              new_data->>'description' AS new_description,
              (old_data->>'transaction_date')::date AS old_transaction_date,
              (new_data->>'transaction_date')::date AS new_transaction_date
          FROM log_history
          WHERE entity_type = 'transaction'
          ORDER BY action_taken_at DESC
          """
        )
      else:
        rows = await conn.fetch(
          """
          SELECT
              id,                         
              user_id,                     
              entity_id AS transac_id,     
              action,
              to_char(action_taken_at, 'YYYY-MM-DD HH24:MI') AS action_taken_at,
              old_data->>'description' AS old_description,
              (old_data->>'transaction_date')::date AS old_transaction_date
          FROM log_history
          WHERE entity_type = 'transaction'
            AND user_id = $1               -- Filter by user_id from the provided parameter
          ORDER BY action_taken_at DESC
          """,
          current_user_id
        )

      result = [
        helpers.format_action_taken_at(dict(row))
        for row in rows
      ]

      return result

  except Exception:
    logger.exception("Error fetching transaction history")
    raise


# CREATE
async def create_transaction(tx, current_user_id: int):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        # Insert transaction without 'created_at'
        inserted = await conn.fetchrow(
            """
            INSERT INTO transactions (
                amount, category_id, description, transaction_date, user_id, transaction_type
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            tx.amount,
            tx.category_id,
            tx.description,
            tx.transaction_date,
            current_user_id,
            tx.transaction_type
        )

          # Fetch the inserted row, including 'created_at'
        row = await conn.fetchrow(
            """
            SELECT t.id, t.amount, t.category_id, t.description, t.transaction_date,
                    t.user_id, t.transaction_type, t.created_at, c.name AS category_name
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.id = $1
            """,
            inserted["id"]
        )

        return dict(row)

  except Exception:
    logger.exception("Error creating transaction")
    raise

# UPDATE (partial update supported)
async def update_transaction(tx_id: int, tx, current_user_id: int, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        old = await conn.fetchrow(
          """
          SELECT *
          FROM transactions
          WHERE id = $1
            AND deleted_at IS NULL
          """,
          tx_id
        )

        if not old:
          return None

        if role != "admin" and old["user_id"] != current_user_id:
          return None

        updated = await conn.fetchrow(
          """
          UPDATE transactions
          SET
            description = COALESCE($1, description),
            transaction_date = COALESCE($2, transaction_date)
          WHERE id = $3
          RETURNING *
          """,
          tx.description,
          tx.transaction_date,
          tx_id
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
          VALUES ('transaction', $1, $2, 'updated', $3::jsonb, $4::jsonb, now())
          """,
          tx_id,
          current_user_id,
          json.dumps({
            "description": old["description"],
            "transaction_date": str(old["transaction_date"]) if old["transaction_date"] else None
          }),
          json.dumps({
            "description": updated["description"],
            "transaction_date": str(updated["transaction_date"]) if updated["transaction_date"] else None
          })
        )

        category_name = await conn.fetchval(
          "SELECT name FROM categories WHERE id = $1",
          updated['category_id']
        )

        return dict(updated, category_name=category_name)

  except Exception:
    logger.exception(f"Error updating transaction id: {tx_id}")
    raise


async def delete_transaction(tx_id: int, current_user_id: int, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        if role != "admin" and role != 1:
          return None

        tx = await conn.fetchrow(
          """
          SELECT *
          FROM transactions
          WHERE id = $1
            AND deleted_at IS NULL
          """,
          tx_id
        )

        if not tx:
          return None

        await conn.execute(
          """
          UPDATE transactions
          SET deleted_at = now()
          WHERE id = $1
          """,
          tx_id
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
          VALUES ('transaction', $1, $2, 'deleted', $3::jsonb, $4::jsonb, now())
          """,
          tx_id,
          current_user_id,
          json.dumps({
              "description": tx["description"],
              "transaction_date": str(tx["transaction_date"]) if tx["transaction_date"] else None,
              "category_id": tx["category_id"],
              "amount": str(tx["amount"]),
              "transaction_type": tx["transaction_type"]
          }),
          json.dumps({
            "description": None,
            "transaction_date": None
          })
        )

        return True

  except Exception:
    logger.exception(f"Error deleting transaction id: {tx_id}")
    raise