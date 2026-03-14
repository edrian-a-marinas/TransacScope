-- ============================================================
-- 003a_seed_simulation_followup.sql
-- Follow-up seed — 40 additional transactions for deployed demo
-- Run AFTER 003_seed_simulation.sql
--
-- Accounts (from 002_seed_admin.sql):
--   id=1 → Super Admin  (edri.a.marinas@gmail.com)   →  5 transactions
--   id=2 → Admin        (test.demo@gmail.com)         → 10 transactions
--   id=3 → Standard     (test.standard@gmail.com)     → 25 transactions
--
-- Dates spread across Jan–Mar 2026 (filling gaps from original seed)
--
-- Category IDs:
--   Expense: 1=Equipment & Assets, 2=Inventory & Supply,
--            3=Operating Overhead, 4=Salary, 5=Marketing & Advertising
--   Income:  6=Standard Room Usage, 7=VIP Room Usage,
--            8=Digital Top-Up / Game Load, 9=Food & Beverage, 10=Tournaments
-- ============================================================

BEGIN;

-- ── Super Admin (id=1) — 5 transactions — spread Jan to Mar ──────────────────
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- January: second payroll cycle
  (1, 4, 28000.00, 'Expense',
   'Second half January payroll payout',
   '2026-01-20', '2026-01-20 10:00:00'),

  -- February: equipment purchase
  (1, 1, 42000.00, 'Expense',
   'Purchased 2 gaming PCs — Q1 upgrade batch',
   '2026-02-12', '2026-02-12 14:00:00'),

  -- February: VIP corporate income
  (1, 7, 35000.00, 'Income',
   'VIP room corporate event booking — 2-day session',
   '2026-02-19', '2026-02-19 09:00:00'),

  -- March: monthly overhead
  (1, 3, 28500.00, 'Expense',
   'March rent, electricity, and water bills',
   '2026-03-05', '2026-03-05 09:00:00'),

  -- March: tournament income
  (1, 10, 18500.00, 'Income',
   'Monthly championship tournament — March registration fees',
   '2026-03-22', '2026-03-22 18:00:00');


-- ── Admin (id=2) — 10 transactions — spread Jan to Mar ───────────────────────
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- January: VIP booking
  (2, 7, 28000.00, 'Income',
   'VIP room group booking — January weekend session',
   '2026-01-17', '2026-01-17 15:00:00'),

  -- January: inventory restock
  (2, 2, 8500.00, 'Expense',
   'Restocked snacks, drinks, and instant meals — January',
   '2026-01-23', '2026-01-23 08:30:00'),

  -- January: food sales
  (2, 9, 5800.00, 'Income',
   'Snack and drink combo sales — January week 4',
   '2026-01-28', '2026-01-28 13:00:00'),

  -- February: standard room weekday
  (2, 6, 17200.00, 'Income',
   'Standard room weekday rentals — February week 2',
   '2026-02-09', '2026-02-09 20:00:00'),

  -- February: load commissions
  (2, 8, 5100.00, 'Income',
   'Game credits and e-wallet top-up commissions — February',
   '2026-02-13', '2026-02-13 17:00:00'),

  -- February: cleaning restock
  (2, 2, 4200.00, 'Expense',
   'Cleaning supplies and office consumables restock',
   '2026-02-17', '2026-02-17 08:30:00'),

  -- February: weekend peak
  (2, 6, 19500.00, 'Income',
   'Standard room weekend peak — February week 3',
   '2026-02-21', '2026-02-21 21:00:00'),

  -- March: food sales
  (2, 9, 7800.00, 'Income',
   'Siomai rice and food bundle sales — March week 2',
   '2026-03-11', '2026-03-11 13:00:00'),

  -- March: tournament income
  (2, 10, 14500.00, 'Income',
   'Weekend gaming tournament — March registration fees',
   '2026-03-21', '2026-03-21 18:00:00'),

  -- March: weekday rentals
  (2, 6, 16800.00, 'Income',
   'Standard room weekday rentals — March week 4',
   '2026-03-26', '2026-03-26 20:00:00');


-- ── Standard User (id=3) — 25 transactions — spread Jan to Mar ───────────────
-- Note: Standard staff record daily floor activity.
-- A few expense entries reflect petty cash / supply requests logged by staff.
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- JANUARY (9 transactions)
  (3, 6, 15200.00, 'Income',
   'Standard room weekday rentals — January week 2',
   '2026-01-06', '2026-01-06 20:00:00'),

  (3, 9, 5100.00, 'Income',
   'Snack and drink combo sales — January week 2',
   '2026-01-07', '2026-01-07 13:00:00'),

  (3, 8, 3800.00, 'Income',
   'Prepaid load and game credits commission — January',
   '2026-01-08', '2026-01-08 16:00:00'),

  (3, 6, 17500.00, 'Income',
   'Standard room weekend peak — January week 2',
   '2026-01-17', '2026-01-17 21:00:00'),

  (3, 9, 6200.00, 'Income',
   'Food combo and siomai rice sales — January week 3',
   '2026-01-18', '2026-01-18 13:00:00'),

  (3, 2, 1800.00, 'Expense',
   'Petty cash — restocked condiments and disposable cups',
   '2026-01-19', '2026-01-19 09:00:00'),

  (3, 7, 20000.00, 'Income',
   'VIP room birthday party booking — January',
   '2026-01-23', '2026-01-23 15:00:00'),

  (3, 8, 4100.00, 'Income',
   'E-wallet and mobile load commissions — January week 4',
   '2026-01-27', '2026-01-27 17:00:00'),

  (3, 9, 5500.00, 'Income',
   'Snack and instant meal sales — January last week',
   '2026-01-30', '2026-01-30 14:00:00'),

  -- FEBRUARY (9 transactions)
  (3, 6, 14800.00, 'Income',
   'Standard room weekday rentals — February week 1',
   '2026-02-02', '2026-02-02 20:00:00'),

  (3, 9, 5700.00, 'Income',
   'Snack and instant meal sales — February week 1',
   '2026-02-04', '2026-02-04 14:00:00'),

  (3, 8, 3500.00, 'Income',
   'Game credits top-up commissions — February week 2',
   '2026-02-09', '2026-02-09 17:00:00'),

  (3, 10, 11000.00, 'Income',
   'Weekend mini tournament — February registration fees',
   '2026-02-09', '2026-02-09 18:00:00'),

  (3, 9, 8200.00, 'Income',
   'Valentines week food and snack combo sales',
   '2026-02-13', '2026-02-13 13:00:00'),

  (3, 2, 2400.00, 'Expense',
   'Petty cash — paper cups, tissue, and cleaning alcohol restock',
   '2026-02-16', '2026-02-16 09:00:00'),

  (3, 6, 16400.00, 'Income',
   'Standard room weekday rentals — February week 3',
   '2026-02-17', '2026-02-17 20:00:00'),

  (3, 8, 4900.00, 'Income',
   'Mobile load and e-wallet commissions — February week 4',
   '2026-02-24', '2026-02-24 17:00:00'),

  (3, 9, 6100.00, 'Income',
   'Food and instant meal sales — February last week',
   '2026-02-26', '2026-02-26 14:00:00'),

  -- MARCH (7 transactions)
  (3, 6, 18200.00, 'Income',
   'Standard room weekend peak — March week 1',
   '2026-03-07', '2026-03-07 21:00:00'),

  (3, 9, 6800.00, 'Income',
   'Siomai rice and snack combo sales — March week 2',
   '2026-03-10', '2026-03-10 13:00:00'),

  (3, 2, 3100.00, 'Expense',
   'Petty cash — snack restock and disposable packaging',
   '2026-03-12', '2026-03-12 09:00:00'),

  (3, 8, 4200.00, 'Income',
   'Game credits and load commissions — March week 2',
   '2026-03-13', '2026-03-13 17:00:00'),

  (3, 10, 9500.00, 'Income',
   'Weekend mini tournament — March registration fees',
   '2026-03-14', '2026-03-14 18:00:00'),

  (3, 6, 20100.00, 'Income',
   'Standard room weekend peak — March week 3',
   '2026-03-15', '2026-03-15 21:00:00'),

  (3, 9, 7200.00, 'Income',
   'Food bundle and drink combo sales — March week 3',
   '2026-03-16', '2026-03-16 13:00:00');

COMMIT;