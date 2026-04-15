-- Sample data to explore relationships

INSERT INTO customers (name, email) VALUES
                                        ('Alice Johnson', 'alice@example.com'),
                                        ('Bob Smith',     'bob@example.com'),
                                        ('Carol White',   'carol@example.com');

-- Alice has 2 orders  (1 customer → many orders)
INSERT INTO orders (customer_id, product, amount, status) VALUES
                                                              (1, 'Laptop',     999.99, 'paid'),
                                                              (1, 'Mouse',       29.99, 'paid');

-- Bob has 1 order
INSERT INTO orders (customer_id, product, amount, status) VALUES
    (2, 'Keyboard',   79.99, 'pending');

-- Carol has no orders yet — valid, she's still a customer
-- (customer_id 3 won't appear in orders — that's fine, NOT an orphan)