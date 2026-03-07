-- =========================================
-- 002_reset_data.sql
-- Wipes all transactional data for a clean
-- demo/test run. Users and roles are preserved.
-- =========================================
-- Run:
--   \i /home/edrian/Projects/Transaction-Processing/backend/migrations/002_reset_data.sql

BEGIN;

-- Notifications
DELETE FROM notifications;

-- Deletion requests
DELETE FROM transaction_deletion_requests;

-- Logs and reports
DELETE FROM log_history;
DELETE FROM reports_history;

-- Transactions (core data)
DELETE FROM transactions;

-- Categories
DELETE FROM categories;

-- Reset all sequences
ALTER SEQUENCE notifications_id_seq                   RESTART WITH 1;
ALTER SEQUENCE transaction_deletion_requests_id_seq   RESTART WITH 1;
ALTER SEQUENCE log_history_id_seq                     RESTART WITH 1;
ALTER SEQUENCE reports_history_id_seq                 RESTART WITH 1;
ALTER SEQUENCE transactions_id_seq                    RESTART WITH 1;
ALTER SEQUENCE categories_id_seq                      RESTART WITH 1;

-- Auth/rate-limit scratch tables (optional, usually fine to wipe)
DELETE FROM email_verifications;
DELETE FROM login_attempts;
ALTER SEQUENCE email_verifications_id_seq  RESTART WITH 1;
ALTER SEQUENCE login_attempts_id_seq       RESTART WITH 1;

-- !! WARNING: Uncomment below to also wipe non-superadmin users !!
-- Preserves id=1 (Super Admin). Cascades will handle FKs.
/*
DELETE FROM users WHERE id != 1;
ALTER SEQUENCE users_id_seq RESTART WITH 2;
*/

COMMIT;