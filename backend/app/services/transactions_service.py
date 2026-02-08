# app/services/transactions_service.py

from db.connection import get_pool


# READ: all transactions (optionally by user)
async def get_transactions(user_id: int | None = None):
  pool = await get_pool()
  async with pool.acquire() as conn:
    if user_id is not None:
      rows = await conn.fetch(
        """
        SELECT t.id, t.amount, t.category_id, c.name AS category_name, t.description, t.transaction_date, t.user_id, transaction_type
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
        ORDER BY t.transaction_date DESC
        """,
        user_id
      )
    else:
      rows = await conn.fetch(
        """
        SELECT t.id, t.amount, t.category_id, c.name AS category_name, t.description, t.transaction_date, t.user_id, transaction_type
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        ORDER BY t.transaction_date DESC
        """
      )
    return [dict(row) for row in rows]



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
    return dict(row) if row else None



# CREATE
async def create_transaction(tx, user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    inserted = await conn.fetchrow(
      """
      INSERT INTO transactions (amount, category_id, description, transaction_date, user_id, transaction_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      """,
      tx.amount,
      tx.category_id,
      tx.description,
      tx.transaction_date,
      user_id,
      tx.transaction_type
    )

    row = await conn.fetchrow(
      """
      SELECT t.id, t.amount, t.category_id, t.description,
        t.transaction_date, t.user_id, t.transaction_type,
        c.name AS category_name
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      WHERE t.id = $1
      """,
      inserted["id"]
    )

    return dict(row)


# UPDATE (partial update supported)
async def update_transaction(tx_id: int, tx, user_id: int):
  pool = await get_pool()
  async with pool.acquire() as conn:
    # Only description and transaction_date are editable
    row = await conn.fetchrow(
      """
      UPDATE transactions t
      SET
        description = COALESCE($1, t.description),
        transaction_date = COALESCE($2, t.transaction_date)
      FROM categories c
      WHERE t.id = $3
        AND t.user_id = $4
        AND t.category_id = c.id
      RETURNING t.id,
                t.amount,
                t.category_id,
                t.description,
                t.transaction_date,
                t.transaction_type,
                t.user_id,
                c.name AS category_name;
      """,
      tx.description,
      tx.transaction_date,
      tx_id,
      user_id
    )

    return dict(row) if row else None


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
    return [dict(row) for row in rows]




# ------------ NOTES ---------------
# PUT
# COALESCE ensures that if a field is not provided, it keeps its current value.



# return [dict(row) for row in rows] = Converts each database row into a normal Python dict and returns them as a list