# app/services/notifications_service.py
import json
import logging
from db.connection import get_pool

logger = logging.getLogger(__name__)


# ── Internal: fan-out a notification to all admins ────────────────────────────
# Called from transactions_service when a deletion request is created.
# Does NOT raise — notification failure must never break the deletion request.
async def notify_admins_deletion_request(
    request_id:       int,
    transaction_id:   int,
    requester_name:   str,
    amount:           float,
    transaction_type: str,
) -> None:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Fetch all admin user IDs (role_id = 1)
            admin_ids = await conn.fetch(
                "SELECT id FROM users WHERE role_id = 1 AND is_active = TRUE"
            )
            if not admin_ids:
                return

            payload = json.dumps({
                "request_id":       request_id,
                "transaction_id":   transaction_id,
                "requester_name":   requester_name,
                "amount":           str(amount),
                "transaction_type": transaction_type,
            })

            # Bulk insert one row per admin
            await conn.executemany(
                """
                INSERT INTO notifications (recipient_user_id, type, payload)
                VALUES ($1, 'deletion_request', $2::jsonb)
                """,
                [(row["id"], payload) for row in admin_ids],
            )
    except Exception:
        # Log but swallow — notifications are non-critical
        logger.exception(
            f"Failed to notify admins for deletion request {request_id}"
        )


# ── GET: all notifications for current user (newest first) ───────────────────
async def get_notifications(recipient_user_id: int) -> list[dict]:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, recipient_user_id, type, payload, is_read, created_at
                FROM notifications
                WHERE recipient_user_id = $1
                ORDER BY created_at DESC
                LIMIT 50
                """,
                recipient_user_id,
            )
            result = []
            for row in rows:
                data = dict(row)
                # asyncpg returns JSONB as a string — parse it to dict
                if isinstance(data.get('payload'), str):
                    import json as _json
                    data['payload'] = _json.loads(data['payload'])
                result.append(data)
            return result
    except Exception:
        logger.exception(f"Error fetching notifications for user {recipient_user_id}")
        raise


# ── GET: unread count only (used by bell badge poll) ─────────────────────────
async def get_unread_count(recipient_user_id: int) -> int:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            count = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE recipient_user_id = $1
                  AND is_read = FALSE
                """,
                recipient_user_id,
            )
            return count or 0
    except Exception:
        logger.exception(f"Error fetching unread count for user {recipient_user_id}")
        raise


# ── PATCH: mark one notification as read ─────────────────────────────────────
async def mark_as_read(notification_id: int, recipient_user_id: int) -> bool:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = $1
                  AND recipient_user_id = $2
                """,
                notification_id,
                recipient_user_id,
            )
            # result is "UPDATE N" — check N > 0
            return result == "UPDATE 1"
    except Exception:
        logger.exception(f"Error marking notification {notification_id} as read")
        raise


# ── PATCH: mark ALL notifications as read for current user ───────────────────
async def mark_all_as_read(recipient_user_id: int) -> int:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE recipient_user_id = $1
                  AND is_read = FALSE
                """,
                recipient_user_id,
            )
            # Return how many rows were updated
            return int(result.split()[-1])
    except Exception:
        logger.exception(f"Error marking all notifications read for user {recipient_user_id}")
        raise


# ── DELETE: remove a single notification ─────────────────────────────────────
async def delete_notification(notification_id: int, recipient_user_id: int) -> bool:
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                DELETE FROM notifications
                WHERE id = $1
                  AND recipient_user_id = $2
                """,
                notification_id,
                recipient_user_id,
            )
            return result == "DELETE 1"
    except Exception:
        logger.exception(f"Error deleting notification {notification_id}")
        raise


# ── Internal: notify requester of deletion request outcome ───────────────────
# Called from transactions_service after admin approves or rejects.
# Does NOT raise — notification failure must never break the review action.
async def notify_requester_deletion_outcome(
  requested_by:     int,
  request_id:       int,
  transaction_id:   int,
  transaction_type: str,
  amount:           float,
  approved:         bool,
) -> None:
  try:
    pool = await get_pool()
    async with pool.acquire() as conn:
      notif_type = "deletion_approved" if approved else "deletion_rejected"
      payload = json.dumps({
        "request_id":       request_id,
        "transaction_id":   transaction_id,
        "transaction_type": transaction_type,
        "amount":           str(amount),
        "approved":         approved,
      })
      await conn.execute(
        """
        INSERT INTO notifications (recipient_user_id, type, payload)
        VALUES ($1, $2::notification_type, $3::jsonb)
        """,
        requested_by,
        notif_type,
        payload,
      )
  except Exception:
    logger.exception(
      f"Failed to notify requester {requested_by} of deletion outcome for request {request_id}"
    )