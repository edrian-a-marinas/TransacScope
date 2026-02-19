-- \! clear
-- \i /home/edrian/Projects/Transaction-Processing/backend/migrations/test_queries.sql

/* 
\dt
\d
\d categories
\d log_history
\d log_history_old
\d reports_history
\d roles
\d transactions
\d users
*/


/*
BEGIN;

DELETE FROM users
WHERE id IN (12, 20, 21, 22);
*/



\echo '------------------------- LIST of USERS (shortcut) --------------------'
SELECT 
  id,
  first_name,
  middle_name,
  last_name,
  phone_number,
  email,
  LEFT(password_hash, 7) || '...' AS password_hash,
  role_id,
  is_active,
  TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
FROM users
ORDER BY id ASC;




--\echo '------------------------- LIST of TRANSACTIONS (including deleted) --------------------'
--SELECT * FROM transactions ORDER BY created_at DESC;

-- \echo '------------------------- LIST of TRANSACTIONS (excluding deleted) --------------------'
-- SELECT * FROM active_transactions ORDER BY created_at DESC;




-- \echo '------------------------- List Log History--------------------'
-- SELECT * FROM log_history;





-- select * from categories;


