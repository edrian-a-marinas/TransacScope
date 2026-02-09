# app/services/transactions_service.py

from db.connection import get_pool
from app.routers import transactions
from app.utils import helpers

# READ: all transactions (optionally by user)
async def get_transactions(current_user_id: int, role):
  pool = await get_pool()
  async with pool.acquire() as conn:

    if role == 'admin':
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
  
  
async def get_transactions_history(current_user_id, role):
  pool = await get_pool()
  async with pool.acquire() as conn:
    if role == "admin":
      rows = await conn.fetch(
        "SELECT * FROM transactions_history ORDER BY action_taken_at DESC"
      )
    else:
      rows = await conn.fetch(
        "SELECT * FROM transactions_history WHERE user_id = $1 ORDER BY action_taken_at DESC",
        current_user_id
      )

    result = [
      helpers.format_action_taken_at(dict(row))
      for row in rows
    ]
  
    return result


# READ: single transaction
async def get_transaction_by_id(tx_id: int, current_user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    role = await transactions.get_user_role(current_user_id)

    if role == "admin":
      row = await conn.fetchrow(
        """
        SELECT *
        FROM transactions
        WHERE id = $1
          AND deleted_at IS NULL
        """,
        tx_id
      )

    else:
      row = await conn.fetchrow(
        """
        SELECT *
        FROM transactions
        WHERE id = $1
          AND user_id = $2
          AND deleted_at IS NULL
        """,
        tx_id,
        current_user_id
      )

    return dict(row) if row else None




# CREATE
async def create_transaction(tx, current_user_id: int, role):
  pool = await get_pool()
  async with pool.acquire() as conn:
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

    row = await conn.fetchrow(
      """
      SELECT t.id, t.amount, t.category_id, t.description, t.transaction_date,
             t.user_id, t.transaction_type, c.name AS category_name
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.id = $1
      """,
      inserted["id"]
    )

    return dict(row)




# UPDATE (partial update supported)
async def update_transaction(tx_id: int, tx, current_user_id: int, role):
  pool = await get_pool()
  async with pool.acquire() as conn:

    # Ownership check
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
      INSERT INTO transactions_history (
        transaction_id,
        user_id,
        action,
        old_description,
        old_transaction_date,
        action_taken_at
      )
      VALUES ($1, $2, 'updated', $3, $4, now())
      """,
      tx_id,
      current_user_id,
      old["description"],
      old["transaction_date"]
    )

    category_name = await conn.fetchval(
      "SELECT name FROM categories WHERE id = $1",
      updated['category_id']
    )

    return dict(updated, category_name=category_name)




async def delete_transaction(tx_id: int, current_user_id: int, role):
  pool = await get_pool()
  async with pool.acquire() as conn:
    
    if role != "admin":
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
      INSERT INTO transactions_history (
          transaction_id,
          user_id,
          action,
          action_taken_at
      )
      VALUES ($1, $2, 'deleted', now())
      """,
      tx_id,
      current_user_id
    )

    return True



# AGGREGATION: monthly summary
async def get_monthly_summary(year: int, month: int, user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT c.name AS category,
        SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE EXTRACT(YEAR FROM t.date) = $1
        AND EXTRACT(MONTH FROM t.date) = $2
        AND t.user_id = $3
      GROUP BY c.name
      ORDER BY total DESC
      """,
      year,
      month,
      user_id
    )

    return [dict(row) for row in rows]




# ------------ NOTES ---------------
# PUT
# COALESCE ensures that if a field is not provided, it keeps its current value.



# return [dict(row) for row in rows] = Converts each database row into a normal Python dict and returns them as a list