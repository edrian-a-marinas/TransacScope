/*
\i /home/edrian/Projects/Transaction-Processing/backend/migrations/001_create_tables.sql

CREATE USER transaction_user WITH PASSWORD 'edrian';
CREATE DATABASE transaction_db;

ALTER DATABASE transaction_db OWNER TO transaction_user;
\q (quit)

psql -U transaction_user -d transaction_db                < ----- THIS every starting

sudo nano /var/lib/pgsql/data/pg_hba.conf

edrian@fedora ~$ psql -U transaction_user -d transaction_db -W       
Password: 

GRANT ALL PRIVILEGES ON DATABASE transaction_db TO transaction_user;

*/

/* Core business tables:

References
users: login, roles and transactions
roles: admin vs standard user, # Rarely changes
categories: Sales, Purchases, Expenses, Salary # admin-manage, rarely changed

Transactional
transactions: all money flow records # core table of system
reports_history: track reports

*/






-- =========================================
-- 001_create_tables.sql
-- Transaction Processing & Reporting System
-- Schema only (no seed data)
-- =========================================

/*
BEGIN;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,   -- admin, standard
    description TEXT,
    created_at TIMESTAMP(0) NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50), 
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(0) NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP(0) NOT NULL DEFAULT now(),
    type VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP,
    CONSTRAINT categories_type_check CHECK (type IN ('Income', 'Expense')),
    CONSTRAINT categories_name_unique_active UNIQUE (name) WHERE deleted_at IS NULL
);



CREATE TABLE public.transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    category_id INTEGER,
    amount NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP(0) DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP(0),
    CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('Expense', 'Income')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE TABLE reports_history (
    id SERIAL PRIMARY KEY,
    generated_by INTEGER REFERENCES users(id),
    report_type VARCHAR(50),         -- daily, weekly, monthly
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP(0) NOT NULL DEFAULT now()
);


CREATE TABLE log_history (
    id SERIAL PRIMARY KEY,                 -- unique log record
    entity_type VARCHAR(50) NOT NULL,      -- e.g., 'transaction', 'category', 'user', 'report'
    entity_id INT NOT NULL,                -- the ID of the record in its table
    user_id INT NOT NULL REFERENCES users(id), -- who performed the action
    action VARCHAR(20) NOT NULL,           -- 'created', 'edited', 'deleted', etc.
    old_data JSONB,                        -- previous state of the record
    new_data JSONB,                        -- optional: new state after change
    action_taken_at TIMESTAMP NOT NULL DEFAULT now()  -- timestamp of the action
);


CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

*/



