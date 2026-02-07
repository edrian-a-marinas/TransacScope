# app/services/transactions_service.py

from db.connection import get_pool


# READ: all transactions (optionally by user)
async def get_transactions(user_id: int | None = None):
  pool = await get_pool()
  async with pool.acquire() as conn:
    if user_id:
      rows = await conn.fetch(
        """
        SELECT t.id, t.amount, t.category_id, c.name AS category_name, t.description, t.date, t.user_id
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
        ORDER BY t.date DESC
        """,
        user_id
      )
    else:
      rows = await conn.fetch(
        """
        SELECT t.id, t.amount, t.category_id, c.name AS category_name, t.description, t.date, t.user_id
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        ORDER BY t.date DESC
        """
      )
    return rows


# READ: single transaction
async def get_transaction_by_id(tx_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT id, amount, category_id, description, date, user_id
      FROM transactions
      WHERE id = $1
      """,
      tx_id
    )
    return row


# CREATE
async def create_transaction(tx, user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      INSERT INTO transactions (amount, category_id, description, date, user_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, amount, category_id, description, date, user_id
      """,
      tx.amount,
      tx.category_id,
      tx.description,
      tx.date,
      user_id
    )
    return row


# UPDATE (partial update supported)
async def update_transaction(tx_id: int, tx):
  pool = await get_pool()
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      UPDATE transactions
      SET
        amount = COALESCE($1, amount),
        category_id = COALESCE($2, category_id),
        description = COALESCE($3, description),
        date = COALESCE($4, date)
      WHERE id = $5
      RETURNING id, amount, category_id, description, date, user_id
      """,
      tx.amount,
      tx.category_id,
      tx.description,
      tx.date,
      tx_id
    )
    return row


# DELETE
async def delete_transaction(tx_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    result = await conn.execute(
      """
      DELETE FROM transactions
      WHERE id = $1
      """,
      tx_id
    )
    return result


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
    return rows
