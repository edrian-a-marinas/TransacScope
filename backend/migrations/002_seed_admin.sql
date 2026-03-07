-- ============================================================
-- 002_seed_admin.sql
-- Seeds: roles, core categories, and the 3 system accounts
-- Passwords: all use 'test1234' with bcrypt cost 6
-- ============================================================
-- Run AFTER 001_create_tables.sql
-- \i /path/to/migrations/002_seed_admin.sql

BEGIN;

-- 1. ROLES
INSERT INTO roles (name, description) VALUES
  ('admin',    'Full access to all system features'),
  ('standard', 'Limited access to own transactions and summaries');

-- 2. CORE CATEGORIES — Expense
INSERT INTO categories (name, description, type) VALUES
  ('Equipment & Assets',      'Long-term investments (new computers, upgrades, gaming chairs, routers/switches)',                    'Expense'),
  ('Inventory & Supply',      'Consumables and short-term items (food & beverages for resale, cleaning supplies, stock peripherals)', 'Expense'),
  ('Operating Overhead',      'Miscellaneous expenses (rent, electricity, internet, water)',                                         'Expense'),
  ('Salary',                  'Payments to employees (technicians, staff, attendants)',                                              'Expense'),
  ('Marketing & Advertising', 'Social media ads, outdoor banners, promotional events',                                              'Expense');

-- 3. CORE CATEGORIES — Income
INSERT INTO categories (name, description, type) VALUES
  ('Standard Room Usage',        'Regular computer rental income (hourly gaming, internet browsing)',          'Income'),
  ('VIP Room Usage',             'Premium room rental income (private room access, high-end PC usage)',        'Income'),
  ('Digital Top-Up / Game Load', 'Commission-based digital sales (game credits, prepaid load, e-wallet top-ups)', 'Income'),
  ('Food & Beverage',            'In-store product sales (snacks, instant meals, soft drinks)',                'Income'),
  ('Tournaments',                'Event-based gaming revenue (registration fees, sponsorship shares)',         'Income');

-- 4. USERS
-- Super Admin (id=1): edri.a.marinas@gmail.com
-- Admin       (id=2): test.demo@gmail.com
-- Standard    (id=3): test.standard@gmail.com
-- All passwords: test1234
INSERT INTO users (email, password_hash, role_id, is_active, first_name, last_name) VALUES
  (
    'edri.a.marinas@gmail.com',
    crypt('test1234', gen_salt('bf', 6)),
    1, true,
    'Edrian', 'Marinas'
  ),
  (
    'test.demo@gmail.com',
    crypt('test1234', gen_salt('bf', 6)),
    1, true,
    'Demo', 'Admin'
  ),
  (
    'test.standard@gmail.com',
    crypt('test1234', gen_salt('bf', 6)),
    2, true,
    'Test', 'Standard'
  );

-- COMMIT;