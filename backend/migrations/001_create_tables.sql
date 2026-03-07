-- ============================================================
-- 001_create_tables.sql
-- Database: transaction_db
-- ============================================================

BEGIN;

-- 1. ROLES
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    description TEXT,
    created_at  TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT roles_name_key UNIQUE (name)
);

-- 2. USERS
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash TEXT         NOT NULL,
    role_id       INTEGER,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    first_name    VARCHAR(50)  NOT NULL,
    middle_name   VARCHAR(50),
    last_name     VARCHAR(50)  NOT NULL,
    phone_number  VARCHAR(20),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. CATEGORIES
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    type        VARCHAR(20)  NOT NULL,
    deleted_at  TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT categories_type_check CHECK (type IN ('Income', 'Expense'))
);

CREATE UNIQUE INDEX categories_name_unique_active ON categories(name) WHERE deleted_at IS NULL;

-- 4. TRANSACTIONS
CREATE TABLE transactions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER,
    category_id      INTEGER,
    amount           NUMERIC(12,2) NOT NULL,
    transaction_type VARCHAR(20)   NOT NULL,
    description      TEXT,
    transaction_date DATE          NOT NULL,
    created_at       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMP(0) WITHOUT TIME ZONE,
    CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('Expense', 'Income')),
    CONSTRAINT transactions_user_id_fkey     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE SET NULL,
    CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 5. EMAIL_VERIFICATIONS
CREATE TABLE email_verifications (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    code       TEXT         NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_used    BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX idx_email_verifications_email   ON email_verifications(email);
CREATE INDEX idx_email_verifications_expires ON email_verifications(expires_at);

-- 6. LOG_HISTORY
CREATE TABLE log_history (
    id              SERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       INTEGER     NOT NULL,
    user_id         INTEGER     NOT NULL,
    action          VARCHAR(20) NOT NULL,
    old_data        JSONB,
    new_data        JSONB,
    action_taken_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT log_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_log_entity      ON log_history(entity_type, entity_id);
CREATE INDEX idx_log_action_time ON log_history(action_taken_at);

-- 7. LOGIN_ATTEMPTS
CREATE TABLE login_attempts (
    id           SERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    ip_address   VARCHAR(45),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip    ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_time  ON login_attempts(attempted_at);

-- 8. NOTIFICATION TYPE + NOTIFICATIONS
CREATE TYPE notification_type AS ENUM (
    'deletion_request',
    'deletion_approved',
    'deletion_rejected'
);

CREATE TABLE notifications (
    id                SERIAL PRIMARY KEY,
    recipient_user_id INTEGER           NOT NULL,
    type              notification_type NOT NULL,
    payload           JSONB             NOT NULL DEFAULT '{}'::jsonb,
    is_read           BOOLEAN           NOT NULL DEFAULT false,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT notifications_recipient_user_id_fkey
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread
    ON notifications(recipient_user_id, is_read) WHERE is_read = false;

-- 9. REPORTS_HISTORY
CREATE TABLE reports_history (
    id           SERIAL PRIMARY KEY,
    generated_by INTEGER,
    report_type  VARCHAR(50),
    start_date   DATE,
    end_date     DATE,
    created_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT reports_history_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- 10. TRANSACTION_DELETION_REQUESTS
CREATE TABLE transaction_deletion_requests (
    id             SERIAL PRIMARY KEY,
    transaction_id INTEGER     NOT NULL,
    requested_by   INTEGER     NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at   TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    reviewed_by    INTEGER,
    reviewed_at    TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT transaction_deletion_requests_transaction_id_fkey
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    CONSTRAINT transaction_deletion_requests_requested_by_fkey
        FOREIGN KEY (requested_by)   REFERENCES users(id),
    CONSTRAINT transaction_deletion_requests_reviewed_by_fkey
        FOREIGN KEY (reviewed_by)    REFERENCES users(id)
);



COMMIT;