# services/reports_service.py

from db.connection import get_pool
import json
import logging

logger = logging.getLogger(__name__)

# --------- CORE SUMMARY LOGIC ----------
async def _generate_summary(conn, start_date, end_date, user_id=None, daily=False, weekly=False, transaction_filter: str = "combined"):
  """
  transaction_filter: "income" | "expense" | "combined"
  """
  summaries = []

  try:
    from datetime import timedelta

    # Build type filter condition
    type_condition = ""
    if transaction_filter.lower() == "income":
      type_condition = "AND t.transaction_type = 'Income'"
    elif transaction_filter.lower() == "expense":
      type_condition = "AND t.transaction_type = 'Expense'"
    # else combined = no extra filter

    # --------- DAILY ----------
    if daily:
      if user_id:
        rows = await conn.fetch(
          f"""
          SELECT 
            t.transaction_date AS date,
            c.name AS category_name,
            t.transaction_type,
            SUM(t.amount) AS total_amount,
            COUNT(*) AS entry_count
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.user_id = $3
            AND t.deleted_at IS NULL
            {type_condition}
          GROUP BY t.transaction_date, c.name, t.transaction_type
          ORDER BY t.transaction_date, total_amount DESC
          """,
          start_date,
          end_date,
          user_id
        )
      else:
        rows = await conn.fetch(
          f"""
          SELECT 
            t.transaction_date AS date,
            c.name AS category_name,
            t.transaction_type,
            SUM(t.amount) AS total_amount,
            COUNT(*) AS entry_count
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.deleted_at IS NULL
            {type_condition}
          GROUP BY t.transaction_date, c.name, t.transaction_type
          ORDER BY t.transaction_date, total_amount DESC
          """,
          start_date,
          end_date
        )

      summaries = [
        dict(row, date=str(row["date"]))
        for row in rows
      ]

    # --------- WEEKLY ----------
    elif weekly:
      current_start = start_date

      while current_start <= end_date:
        current_end = min(current_start + timedelta(days=6), end_date)

        if user_id:
          rows = await conn.fetch(
            f"""
            SELECT 
              c.name AS category_name,
              t.transaction_type,
              SUM(t.amount) AS total_amount,
              COUNT(*) AS entry_count
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.transaction_date BETWEEN $1 AND $2
              AND t.user_id = $3
              AND t.deleted_at IS NULL
              {type_condition}
            GROUP BY c.name, t.transaction_type
            ORDER BY total_amount DESC
            """,
            current_start,
            current_end,
            user_id
          )
        else:
          rows = await conn.fetch(
            f"""
            SELECT 
              c.name AS category_name,
              t.transaction_type,
              SUM(t.amount) AS total_amount,
              COUNT(*) AS entry_count
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.transaction_date BETWEEN $1 AND $2
              AND t.deleted_at IS NULL
              {type_condition}
            GROUP BY c.name, t.transaction_type
            ORDER BY total_amount DESC
            """,
            current_start,
            current_end
          )

        for row in rows:
          summaries.append(
            dict(
              row,
              week_start=str(current_start),
              week_end=str(current_end)
            )
          )

        current_start = current_end + timedelta(days=1)

    # --------- MONTHLY / TOTAL ----------
    else:
      if user_id:
        rows = await conn.fetch(
          f"""
          SELECT 
            c.name AS category_name,
            t.transaction_type,
            SUM(t.amount) AS total_amount,
            COUNT(*) AS entry_count
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.user_id = $3
            AND t.deleted_at IS NULL
            {type_condition}
          GROUP BY c.name, t.transaction_type
          ORDER BY total_amount DESC
          """,
          start_date,
          end_date,
          user_id
        )
      else:
        rows = await conn.fetch(
          f"""
          SELECT 
            c.name AS category_name,
            t.transaction_type,
            SUM(t.amount) AS total_amount,
            COUNT(*) AS entry_count
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.deleted_at IS NULL
            {type_condition}
          GROUP BY c.name, t.transaction_type
          ORDER BY total_amount DESC
          """,
          start_date,
          end_date
        )

      summaries = [dict(row) for row in rows]

    return summaries

  except Exception:
    logger.exception("Error generating report summary")
    raise


# --------- PUBLIC API ----------
async def generate_report(report, current_user_id: int, role: str, transaction_filter: str = "combined"):
  """
  transaction_filter: "income" | "expense" | "combined"
  """
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      async with conn.transaction():

        daily = report.report_type.lower() == "daily"
        weekly = report.report_type.lower() == "weekly"

        # Admin can generate report for all users
        user_id_filter = None if role == "admin" else current_user_id

        summary = await _generate_summary(
          conn,
          report.start_date,
          report.end_date,
          user_id=user_id_filter,
          daily=daily,
          weekly=weekly,
          transaction_filter=transaction_filter
        )

        # Insert report history
        report_row = await conn.fetchrow(
          """
          INSERT INTO reports_history (
            generated_by,
            report_type,
            start_date,
            end_date
          )
          VALUES ($1, $2, $3, $4)
          RETURNING id, generated_by, report_type, start_date, end_date, created_at
          """,
          current_user_id,
          report.report_type,
          report.start_date,
          report.end_date
        )

        return {
          "report": dict(report_row),
          "summary": summary
        }

  except Exception:
    logger.exception("Error generating report")
    raise