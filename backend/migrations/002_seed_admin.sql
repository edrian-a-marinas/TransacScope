/*
BEGIN;


-- Reference tables, Initial values -- 
INSERT INTO roles (name, description) 
  VALUES
    ('admin', 'Full access to all system features'),
    ('standard', 'Limited access to own transactions and summaries');


INSERT INTO categories (name, description) 
  VALUES
    ('Sales', 'Revenue from selling items'),
    ('Purchases', 'Money spent buying items from suppliers'),
    ('Expenses', 'Operational costs like rent, utilities'),
    ('Salary', 'Payments to employees');
*/


/*

INSERT INTO users (email, password_hash, role_id) 
  VALUES
    ('edri.a.marinas@gmail.com', '$2b$12$HnnCdwcHMnR2SxDsIgJ1QO9LfNvkAuS5hQ..Di4FThpNryMTvH89G
', 1);


COMMIT;
*/