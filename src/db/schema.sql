-- ============================================
-- Lesson 8: Customer → Orders (1 to Many)
-- ============================================

-- CUSTOMERS table
-- PK: id  →  "Who am I?"
CREATE TABLE IF NOT EXISTS customers (
                                         id        INTEGER PRIMARY KEY AUTOINCREMENT,  -- PK: unique, never null
                                         name      TEXT    NOT NULL,
                                         email     TEXT    NOT NULL UNIQUE,            -- business rule: no duplicate emails
                                         created_at TEXT   DEFAULT (datetime('now'))
    );

-- ORDERS table
-- PK: id         → "Who am I?"
-- FK: customer_id → "Who do I belong to?" (links to customers.id)
CREATE TABLE IF NOT EXISTS orders (
                                      id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                      customer_id INTEGER NOT NULL,                 -- FK: cannot be null → every order MUST have an owner
                                      product     TEXT    NOT NULL,
                                      amount      REAL    NOT NULL,                 -- stored as REAL — watch for precision bugs!
                                      status      TEXT    DEFAULT 'pending',        -- pending | paid | cancelled
                                      created_at  TEXT    DEFAULT (datetime('now')),

    -- FK constraint: enforces referential integrity
    -- If customer_id doesn't exist in customers → INSERT is rejected
    -- This PREVENTS orphan records at the DB level
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT   -- block deleting a customer who has orders
    );

-- ============================================
-- Relationship Summary:
--   customers (1) ──────────< orders (N)
--   One customer can have MANY orders
--   One order belongs to EXACTLY ONE customer
-- ============================================

-- QA QUERIES (Lesson 8 checks)

-- 1. Find ORPHAN orders (orders with no valid customer)
--    Should return 0 rows if FK integrity is working
-- SELECT * FROM orders o
-- LEFT JOIN customers c ON o.customer_id = c.id
-- WHERE c.id IS NULL;

-- 2. Count orders per customer (spot duplicate/suspicious data)
-- SELECT customer_id, COUNT(*) as order_count
-- FROM orders
-- GROUP BY customer_id
-- HAVING COUNT(*) > 1;

-- 3. Check for precision issues (amount stored ≠ amount expected)
-- SELECT id, amount FROM orders WHERE amount != ROUND(amount, 2);