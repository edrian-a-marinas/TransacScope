-- ============================================================
-- 003b_seed_simulation_standard_expenses.sql
-- 30 additional Standard User (id=3) transactions
-- Run AFTER 003a_seed_simulation_followup.sql
--
-- Distribution:
--   January  → 20 transactions (heavy expense month — business startup/ramp-up)
--   February →  5 transactions (mix of expense and income)
--   March    →  5 transactions (mix of expense and income)
--
-- Category IDs:
--   Expense: 1=Equipment & Assets, 2=Inventory & Supply,
--            3=Operating Overhead, 4=Salary, 5=Marketing & Advertising
--   Income:  6=Standard Room Usage, 7=VIP Room Usage,
--            8=Digital Top-Up / Game Load, 9=Food & Beverage, 10=Tournaments
-- ============================================================

BEGIN;

-- ── Standard User (id=3) — JANUARY — 20 transactions ─────────────────────────
-- Heavy on expenses: equipment, inventory, overhead, salary, and marketing
-- to simulate a business ramping up in its first month of the year.

INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  -- Equipment & Assets (cat 1)
  (3, 1, 12500.00, 'Expense',
   'Purchased 2 gaming headsets and peripheral set — January setup',
   '2026-01-02', '2026-01-02 10:00:00'),

  (3, 1, 34000.00, 'Expense',
   'Gaming chairs and desk upgrades — floor refresh batch',
   '2026-01-03', '2026-01-03 11:30:00'),

  (3, 1, 8800.00, 'Expense',
   'UPS units and surge protectors for all stations',
   '2026-01-04', '2026-01-04 09:00:00'),

  -- Inventory & Supply (cat 2)
  (3, 2, 9200.00, 'Expense',
   'Bulk snack and beverage restocking — January opening inventory',
   '2026-01-02', '2026-01-02 08:30:00'),

  (3, 2, 4600.00, 'Expense',
   'Instant meals, siomai packs, and cup noodle restock',
   '2026-01-09', '2026-01-09 08:00:00'),

  (3, 2, 3100.00, 'Expense',
   'Bottled water cases and canned drinks — mid-January restock',
   '2026-01-16', '2026-01-16 08:15:00'),

  (3, 2, 2200.00, 'Expense',
   'Disposable cups, tissue, and condiment restock',
   '2026-01-22', '2026-01-22 09:30:00'),

  (3, 2, 1500.00, 'Expense',
   'Cleaning alcohol, trash bags, and janitorial supplies',
   '2026-01-26', '2026-01-26 08:45:00'),

  -- Operating Overhead (cat 3)
  (3, 3, 6400.00, 'Expense',
   'Internet subscription — January billing (fiber + backup line)',
   '2026-01-05', '2026-01-05 10:00:00'),

  (3, 3, 3200.00, 'Expense',
   'Generator fuel and monthly maintenance fee — January',
   '2026-01-12', '2026-01-12 11:00:00'),

  (3, 3, 1800.00, 'Expense',
   'Aircon filter cleaning and preventive maintenance',
   '2026-01-15', '2026-01-15 10:30:00'),

  (3, 3, 2500.00, 'Expense',
   'Miscellaneous overhead — license and permit renewal fees',
   '2026-01-20', '2026-01-20 09:00:00'),

  -- Salary (cat 4)
  (3, 4, 18000.00, 'Expense',
   'First half January payroll — floor staff and cashier',
   '2026-01-06', '2026-01-06 10:00:00'),

  (3, 4, 18000.00, 'Expense',
   'Second half January payroll — floor staff and cashier',
   '2026-01-21', '2026-01-21 10:00:00'),

  (3, 4, 4500.00, 'Expense',
   'Part-time staff overtime pay — January peak weekends',
   '2026-01-29', '2026-01-29 10:00:00'),

  -- Marketing & Advertising (cat 5)
  (3, 5, 3500.00, 'Expense',
   'Facebook and Instagram boosted posts — January promo launch',
   '2026-01-03', '2026-01-03 12:00:00'),

  (3, 5, 1800.00, 'Expense',
   'Printed tarpaulin banners and flyer distribution',
   '2026-01-07', '2026-01-07 09:00:00'),

  (3, 5, 2200.00, 'Expense',
   'TikTok ad campaign — gaming café highlight reel boost',
   '2026-01-14', '2026-01-14 11:00:00'),

  (3, 5, 1200.00, 'Expense',
   'Loyalty card printing and promo voucher design',
   '2026-01-24', '2026-01-24 10:00:00'),

  -- Income (1 entry to break the streak slightly — walk-in revenue)
  (3, 6, 11200.00, 'Income',
   'Standard room weekday walk-in rentals — January week 1',
   '2026-01-08', '2026-01-08 21:00:00');


-- ── Standard User (id=3) — FEBRUARY — 5 transactions ─────────────────────────
-- 3 expenses (supply restock, overhead, salary) + 2 income entries

INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  (3, 2, 5800.00, 'Expense',
   'February snack and beverage inventory restock',
   '2026-02-01', '2026-02-01 08:30:00'),

  (3, 3, 6400.00, 'Expense',
   'Internet and utility bills — February overhead',
   '2026-02-05', '2026-02-05 10:00:00'),

  (3, 4, 18000.00, 'Expense',
   'First half February payroll — floor staff and cashier',
   '2026-02-06', '2026-02-06 10:00:00'),

  (3, 6, 13600.00, 'Income',
   'Standard room weekday rentals — February week 3',
   '2026-02-17', '2026-02-17 20:30:00'),

  (3, 9, 6400.00, 'Income',
   'Food bundle and snack combo sales — February last week',
   '2026-02-27', '2026-02-27 14:00:00');


-- ── Standard User (id=3) — MARCH — 5 transactions ────────────────────────────
-- 2 expenses (supplies, salary) + 3 income entries

INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date, created_at) VALUES

  (3, 2, 6100.00, 'Expense',
   'March snack, drinks, and instant meal restock',
   '2026-03-02', '2026-03-02 08:30:00'),

  (3, 4, 18000.00, 'Expense',
   'First half March payroll — floor staff and cashier',
   '2026-03-06', '2026-03-06 10:00:00'),

  (3, 6, 17400.00, 'Income',
   'Standard room weekend peak — March week 2',
   '2026-03-08', '2026-03-08 21:00:00'),

  (3, 8, 5100.00, 'Income',
   'Game credits and e-wallet load commissions — March week 2',
   '2026-03-11', '2026-03-11 17:00:00'),

  (3, 10, 12500.00, 'Income',
   'March weekend gaming tournament — registration and prize pool fees',
   '2026-03-21', '2026-03-21 18:30:00');

COMMIT;