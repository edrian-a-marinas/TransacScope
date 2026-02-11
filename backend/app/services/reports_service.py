# services/reports_service.py

from db.connection import get_pool
import json

# --------- CORE SUMMARY LOGIC ----------
async def _generate_summary(conn, start_date, end_date, user_id=None, weekly=False):
  """
  Generates summary aggregation for given date range.
  weekly=False -> monthly/total summary
  weekly=True -> weekly split summary
  """
  summaries = []

  if weekly:
    from datetime import timedelta

    current_start = start_date
    while current_start <= end_date:
      current_end = min(current_start + timedelta(days=6), end_date)

      if user_id:
        rows = await conn.fetch(
          """
          SELECT c.name AS category_name,
                 SUM(t.amount) AS total_amount
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.user_id = $3
            AND t.deleted_at IS NULL
          GROUP BY c.name
          ORDER BY total_amount DESC
          """,
          current_start,
          current_end,
          user_id
        )
      else:
        rows = await conn.fetch(
          """
          SELECT c.name AS category_name,
                 SUM(t.amount) AS total_amount
          FROM transactions t
          JOIN categories c ON c.id = t.category_id
          WHERE t.transaction_date BETWEEN $1 AND $2
            AND t.deleted_at IS NULL
          GROUP BY c.name
          ORDER BY total_amount DESC
          """,
          current_start,
          current_end
        )

      for r in rows:
        summaries.append(dict(r, week_start=str(current_start), week_end=str(current_end)))

      current_start = current_end + timedelta(days=1)
  else:
    if user_id:
      rows = await conn.fetch(
        """
        SELECT c.name AS category_name,
               SUM(t.amount) AS total_amount
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.transaction_date BETWEEN $1 AND $2
          AND t.user_id = $3
          AND t.deleted_at IS NULL
        GROUP BY c.name
        ORDER BY total_amount DESC
        """,
        start_date,
        end_date,
        user_id
      )
    else:
      rows = await conn.fetch(
        """
        SELECT c.name AS category_name,
               SUM(t.amount) AS total_amount
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.transaction_date BETWEEN $1 AND $2
          AND t.deleted_at IS NULL
        GROUP BY c.name
        ORDER BY total_amount DESC
        """,
        start_date,
        end_date
      )
    summaries = [dict(r) for r in rows]

  return summaries


# --------- PUBLIC API ----------
async def generate_report(report, current_user_id: int, role: str):
  """
  payload: ReportCreate schema
  Admins can generate reports for all users (if role=="admin").
  Standard users can generate reports only for themselves.
  """
  pool = await get_pool()
  async with pool.acquire() as conn:

    weekly = report.report_type.lower() == "weekly"

    # Admin can generate report for all users
    user_id_filter = None if role == "admin" else current_user_id

    summary = await _generate_summary(
      conn,
      report.start_date,
      report.end_date,
      user_id=user_id_filter,
      weekly=weekly
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
