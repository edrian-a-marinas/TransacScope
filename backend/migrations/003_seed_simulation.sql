-- ============================================================
-- 003_seed_simulation.sql
-- Prototype/demo data only — NOT for production
-- Simulates realistic café transactions across Jan–Mar 2026
--
-- Assumes after 002_seed_admin.sql:
--   user id=1  → Super Admin  (edri.a.marinas@gmail.com)
--   user id=2  → Admin        (test.demo@gmail.com)
--   user id=3  → Standard     (test.standard@gmail.com)
--
-- Category IDs (from 002):
--   Expense: 1=Equipment & Assets, 2=Inventory & Supply,
--            3=Operating Overhead, 4=Salary, 5=Marketing & Advertising
--   Income:  6=Standard Room Usage, 7=VIP Room Usage,
--            8=Digital Top-Up / Game Load, 9=Food & Beverage, 10=Tournaments
-- ============================================================

BEGIN;

-- ── Super Admin transactions (5) ─────────────────────────────────────────────
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- January: Monthly rent + utilities
  (1, 3, 28500.00, 'Expense',
   'January rent, electricity, and water bills',
   '2026-01-05', '2026-01-05 09:15:00'),

  -- January: Purchased 3 new gaming PCs
  (1, 1, 87000.00, 'Expense',
   'Purchased 3 new gaming PCs (GPU upgrade batch)',
   '2026-01-15', '2026-01-15 14:30:00'),

  -- February: First half payroll
  (1, 4, 28000.00, 'Expense',
   'First half February payroll payout',
   '2026-02-05', '2026-02-05 10:00:00'),

  -- February: Weekend tournament income
  (1, 10, 21000.00, 'Income',
   'Monthly championship tournament — registration fees',
   '2026-02-22', '2026-02-22 18:00:00'),

  -- March: Facebook ad campaign boost
  (1, 5, 5000.00, 'Expense',
   'Facebook and TikTok boosted ad campaign — March promo',
   '2026-03-01', '2026-03-01 11:00:00');


-- ── Admin transactions (5) ───────────────────────────────────────────────────
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- January: Restock snacks and drinks
  (2, 2, 14200.00, 'Expense',
   'Restocked snacks, instant meals, and bottled drinks',
   '2026-01-10', '2026-01-10 08:45:00'),

  -- January: Standard room weekday income
  (2, 6, 16800.00, 'Income',
   'Standard room weekday rentals — January week 3',
   '2026-01-20', '2026-01-20 20:00:00'),

  -- February: VIP room corporate booking
  (2, 7, 32000.00, 'Income',
   'VIP room corporate group booking — 2-day event',
   '2026-02-08', '2026-02-08 09:00:00'),

  -- February: Cleaning supplies restock
  (2, 2, 3800.00, 'Expense',
   'Cleaning supplies and peripherals restock',
   '2026-02-18', '2026-02-18 10:30:00'),

  -- March: Digital top-up commissions
  (2, 8, 9400.00, 'Income',
   'Game credits and e-wallet top-up commissions — March week 1',
   '2026-03-03', '2026-03-03 17:00:00');


-- ── Standard User transactions (10) ──────────────────────────────────────────
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- January: Standard room weekend income
  (3, 6, 18500.00, 'Income',
   'Standard room weekend peak — hourly gaming rentals',
   '2026-01-11', '2026-01-11 21:00:00'),

  -- January: Food and beverage sales
  (3, 9, 6200.00, 'Income',
   'Snack and drink combo sales — January week 2',
   '2026-01-14', '2026-01-14 19:30:00'),

  -- January: Load and game credits
  (3, 8, 4750.00, 'Income',
   'Prepaid load and game credits commission',
   '2026-01-21', '2026-01-21 16:00:00'),

  -- February: Standard room income
  (3, 6, 14200.00, 'Income',
   'Standard room weekday rentals — February week 1',
   '2026-02-03', '2026-02-03 20:00:00'),

  -- February: VIP room booking
  (3, 7, 12000.00, 'Income',
   'VIP room birthday party booking',
   '2026-02-14', '2026-02-14 15:00:00'),

  -- February: Food sales
  (3, 9, 7100.00, 'Income',
   'Food combo and siomai rice sales — Valentines week',
   '2026-02-15', '2026-02-15 13:00:00'),

  -- February: Mini tournament
  (3, 10, 8500.00, 'Income',
   'Weekend mini tournament — registration fees',
   '2026-02-21', '2026-02-21 18:30:00'),

  -- February: Load commissions
  (3, 8, 3200.00, 'Income',
   'Mobile load and e-wallet top-up commissions',
   '2026-02-25', '2026-02-25 17:00:00'),

  -- March: Standard room weekend
  (3, 6, 19800.00, 'Income',
   'Standard room weekend peak — March first weekend',
   '2026-03-01', '2026-03-01 21:30:00'),

  -- March: Food and beverage
  (3, 9, 5900.00, 'Income',
   'Snack and instant meal sales — March week 1',
   '2026-03-04', '2026-03-04 14:00:00');

-- COMMIT;