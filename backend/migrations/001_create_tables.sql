/*
CREATE USER transaction_user WITH PASSWORD 'edrian';
CREATE DATABASE transaction_db;

ALTER DATABASE transaction_db OWNER TO transaction_user;
\q (quit)

psql -U transaction_user -d transaction_db                < ----- THIS every starting

sudo nano /var/lib/pgsql/data/pg_hba.conf

edrian@fedora ~$ psql -U transaction_user -d transaction_db -W       
Password: 

GRANT ALL PRIVILEGES ON DATABASE transaction_db TO transaction_user;

\i /home/edrian/Projects/Transaction-Processing/backend/migrations/001_create_tables.sql
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,   -- Sales, Purchases, Expenses, Salary
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    amount NUMERIC(12, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE reports_history (
    id SERIAL PRIMARY KEY,
    generated_by INTEGER REFERENCES users(id),
    report_type VARCHAR(50),         -- daily, weekly, monthly
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

*/
