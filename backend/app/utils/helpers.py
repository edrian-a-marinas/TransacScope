from datetime import datetime

# ---- helpers -----
def format_action_taken_at(row: dict) -> dict:
  if isinstance(row.get("action_taken_at"), datetime):
    row["action_taken_at"] = row["action_taken_at"].strftime(
      "%Y-%m-%d %H:%M:%S"
    )
  return row