# app/services/transactions_service.py

from db.connection import get_pool
from app.utils import helpers
import json
import logging
from datetime import datetime 

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


async def get_transaction_history(current_user_id, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      
      if role == "admin" or role == 1:
        # For admin or role 1, we fetch transactions for all users
        rows = await conn.fetch(
          """
          SELECT
            lh.id,
            lh.user_id,
            lh.entity_id,
            lh.entity_type,
            lh.action,
            lh.action_taken_at,
            lh.old_data->>'description' AS old_description,
            lh.new_data->>'description' AS new_description,
            (lh.old_data->>'transaction_date')::date AS old_transaction_date,
            (lh.new_data->>'transaction_date')::date AS new_transaction_date,
            t.category_id,
            t.transaction_type,
            c.name AS category_name
          FROM log_history lh
          LEFT JOIN transactions t ON lh.entity_id = t.id  -- Join transactions to get category_id
          LEFT JOIN categories c ON t.category_id = c.id  -- Join categories to get category_name
          WHERE lh.entity_type = 'transaction'
          ORDER BY lh.action_taken_at DESC
          """
        )
      else:
        # For normal users, fetch only their own transactions
        rows = await conn.fetch(
          """
          SELECT
            lh.id,
            lh.user_id,
            lh.entity_id,
            lh.entity_type,
            lh.action,
            lh.action_taken_at,
            lh.old_data->>'description' AS old_description,
            lh.new_data->>'description' AS new_description,
            (lh.old_data->>'transaction_date')::date AS old_transaction_date,
            (lh.new_data->>'transaction_date')::date AS new_transaction_date,
            t.category_id,
            t.transaction_type,
            c.name AS category_name
          FROM log_history lh
          LEFT JOIN transactions t ON lh.entity_id = t.id  -- Join transactions table to get category_id
          LEFT JOIN categories c ON t.category_id = c.id  -- Join categories table to get category_name
          WHERE lh.entity_type = 'transaction'
            AND lh.user_id = $1
          ORDER BY lh.action_taken_at DESC
          """,
          current_user_id
        )

      # Format the result before returning
      result = [
        helpers.format_action_taken_at(dict(row))
        for row in rows
      ]

      return result

  except Exception:
    logger.exception("Error fetching transaction history")
    raise

# CREATE deletion request
async def create_transaction_deletion_request(tx_id: int, requested_by: int):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      # Check if request already exists
      existing = await conn.fetchrow(
        """
        SELECT *
        FROM transaction_deletion_requests
        WHERE transaction_id = $1
          AND status = 'pending'
        """,
        tx_id
      )
      if existing:
        return None

      inserted = await conn.fetchrow(
        """
        INSERT INTO transaction_deletion_requests (
          transaction_id, requested_by
        )
        VALUES ($1, $2)
        RETURNING *
        """,
        tx_id,
        requested_by
      )
      return dict(inserted)

  except Exception:
    logger.exception(f"Error creating deletion request for tx {tx_id}")
    raise


# LIST all pending deletion requests (for admin)
async def get_deletion_requests():
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    dr.*,
                    u.first_name,
                    u.last_name,
                    t.amount,
                    t.transaction_type,
                    t.category_id,
                    t.description,
                    t.transaction_date,
                    c.name AS category_name
                FROM transaction_deletion_requests dr
                JOIN users u ON u.id = dr.requested_by
                LEFT JOIN transactions t ON t.id = dr.transaction_id
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE dr.status = 'pending'
                ORDER BY dr.requested_at DESC
                """
            )

            result = []
            for row in rows:
                data = dict(row)
                # requester info
                data["requester"] = {
                    "first_name": data.pop("first_name"),
                    "last_name": data.pop("last_name"),
                }
                # transaction info
                if data.get("amount") is not None:
                    data["transaction"] = {
                        "id": data["transaction_id"],
                        "amount": data.pop("amount"),
                        "transaction_type": data.pop("transaction_type"),
                        "category_id": data.pop("category_id"),
                        "description": data.pop("description"),
                        "transaction_date": data.pop("transaction_date"),
                        "category_name": data.pop("category_name"),
                    }
                else:
                    data["transaction"] = None

                result.append(data)

            return result

    except Exception:
        logger.exception("Error fetching deletion requests")
        raise


# PATCH: approve/reject deletion request (admin only)
async def review_deletion_request(request_id: int, admin_id: int, approve: bool):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():
        req = await conn.fetchrow(
          """
          SELECT *
          FROM transaction_deletion_requests
          WHERE id = $1
          """,
          request_id
        )
        if not req or req["status"] != "pending":
          return None

        status = "approved" if approve else "rejected"
        await conn.execute(
          """
          UPDATE transaction_deletion_requests
          SET status = $1, reviewed_by = $2, reviewed_at = now()
          WHERE id = $3
          """,
          status,
          admin_id,
          request_id
        )

        # If approved, soft-delete the transaction
        if approve:
          await conn.execute(
            """
            UPDATE transactions
            SET deleted_at = now()
            WHERE id = $1
            """,
            req["transaction_id"]
          )

        return dict(req, status=status, reviewed_by=admin_id, reviewed_at=str(datetime.now()))
  except Exception:
    logger.exception(f"Error reviewing deletion request {request_id}")
    raise

async def get_deletion_requests_my_history(current_user_id: int, role: str):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:

      if role == "admin" or role == 1:
        # Admin: rows where THIS admin was the reviewer
        rows = await conn.fetch(
          """
          SELECT
            dr.*,
            -- requester identity
            req_u.first_name   AS requester_first_name,
            req_u.last_name    AS requester_last_name,
            -- reviewer identity (themselves, but included for schema consistency)
            rev_u.first_name   AS reviewer_first_name,
            rev_u.last_name    AS reviewer_last_name,
            -- transaction snapshot
            t.amount,
            t.transaction_type,
            t.category_id,
            t.description,
            t.transaction_date,
            c.name             AS category_name
          FROM transaction_deletion_requests dr
          JOIN users req_u ON req_u.id = dr.requested_by
          LEFT JOIN users rev_u ON rev_u.id = dr.reviewed_by
          LEFT JOIN transactions t ON t.id = dr.transaction_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE dr.reviewed_by = $1
            AND dr.status IN ('approved', 'rejected')
          ORDER BY dr.reviewed_at DESC
          """,
          current_user_id,
        )
      else:
        # Standard user: all their own requests regardless of status
        rows = await conn.fetch(
          """
          SELECT
            dr.*,
            -- requester (themselves, included for schema consistency)
            req_u.first_name   AS requester_first_name,
            req_u.last_name    AS requester_last_name,
            -- reviewer identity (admin who acted, may be NULL if pending)
            rev_u.first_name   AS reviewer_first_name,
            rev_u.last_name    AS reviewer_last_name,
            -- transaction snapshot
            t.amount,
            t.transaction_type,
            t.category_id,
            t.description,
            t.transaction_date,
            c.name             AS category_name
          FROM transaction_deletion_requests dr
          JOIN users req_u ON req_u.id = dr.requested_by
          LEFT JOIN users rev_u ON rev_u.id = dr.reviewed_by
          LEFT JOIN transactions t ON t.id = dr.transaction_id
          LEFT JOIN categories c ON c.id = t.category_id
          WHERE dr.requested_by = $1
          ORDER BY dr.requested_at DESC
          """,
          current_user_id,
        )

      result = []
      for row in rows:
        data = dict(row)

        # Nest requester
        data["requester"] = {
          "first_name": data.pop("requester_first_name"),
          "last_name":  data.pop("requester_last_name"),
        }

        # Nest reviewer (may be None if request is still pending)
        rev_first = data.pop("reviewer_first_name", None)
        rev_last  = data.pop("reviewer_last_name",  None)
        data["reviewer"] = (
          {"first_name": rev_first, "last_name": rev_last}
          if rev_first is not None
          else None
        )

        # Nest transaction snapshot
        if data.get("amount") is not None:
          data["transaction"] = {
            "id":               data["transaction_id"],
            "amount":           data.pop("amount"),
            "transaction_type": data.pop("transaction_type"),
            "category_id":      data.pop("category_id"),
            "description":      data.pop("description"),
            "transaction_date": data.pop("transaction_date"),
            "category_name":    data.pop("category_name"),
          }
        else:
          # Clean up orphaned columns even when transaction is gone
          for col in ("amount", "transaction_type", "category_id",
                      "description", "transaction_date", "category_name"):
            data.pop(col, None)
          data["transaction"] = None

        result.append(data)

      return result

  except Exception:
    logger.exception(
      f"Error fetching deletion request history for user {current_user_id}"
    )
    raise


async def count_transactions_by_category(category_id: int, current_user_id: int, role):
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:

      if role == "admin" or role == 1:
        count = await conn.fetchval(
          """
          SELECT COUNT(*)
          FROM transactions
          WHERE category_id = $1
            AND deleted_at IS NULL
          """,
          category_id
        )
      else:
        count = await conn.fetchval(
          """
          SELECT COUNT(*)
          FROM transactions
          WHERE category_id = $1
            AND user_id = $2
            AND deleted_at IS NULL
          """,
          category_id,
          current_user_id
        )

      return count or 0

  except Exception:
    logger.exception("Error counting transactions by category")
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