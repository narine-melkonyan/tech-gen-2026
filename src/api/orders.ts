import { NextFunction, Request, Response, Router } from 'express';
import type { CreateOrderDto, OrderWithCustomer } from '../models/order';
import { db } from '../db/database';

export const ordersRouter = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// GET /api/orders
ordersRouter.get('/', wrap(async (_req, res) => {
    const orders = db.prepare(`
    SELECT o.*, c.name AS customer_name, c.email AS customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.id
  `).all() as unknown as OrderWithCustomer[];
    res.json(orders);
}));

// GET /api/orders/:id
ordersRouter.get('/:id', wrap(async (req, res) => {
    const order = db.prepare(`
    SELECT o.*, c.name AS customer_name, c.email AS customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `).get(Number(req.params.id)) as unknown as OrderWithCustomer | undefined;

    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(order);
}));

// GET /api/orders/qa/orphans
ordersRouter.get('/qa/orphans', wrap(async (_req, res) => {
    const orphans = db.prepare(`
    SELECT o.* FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE c.id IS NULL
  `).all();
    res.json({ description: 'Orphan records check', count: orphans.length, orphans, passed: orphans.length === 0 });
}));

// GET /api/orders/qa/precision
ordersRouter.get('/qa/precision', wrap(async (_req, res) => {
    const issues = db.prepare(`
    SELECT id, product, amount, ROUND(amount, 2) AS expected
    FROM orders WHERE amount != ROUND(amount, 2)
  `).all();
    res.json({ description: 'Precision check', count: issues.length, issues, passed: issues.length === 0 });
}));

// POST /api/orders/qa/query — raw SQL runner
ordersRouter.post('/qa/query', wrap(async (req, res) => {
    const { sql } = req.body as { sql: string };

    if (!sql) { res.status(400).json({ error: 'sql is required' }); return; }

    const normalized = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
        .toLowerCase();

    const allowed = ['select', 'delete', 'update'];
    if (!allowed.some(kw => normalized.startsWith(kw))) {
        res.status(400).json({ error: 'Only SELECT, UPDATE and DELETE queries are allowed' });
        return;
    }

    if (normalized.startsWith('select')) {
        const rows = db.prepare(sql).all();
        res.json({ rows, count: rows.length });
    } else {
        const { changes } = db.prepare(sql).run();
        res.json({ rows: [], count: 0, changes, message: `${changes} row(s) affected` });
    }
}));

// POST /api/orders — create
ordersRouter.post('/', wrap(async (req, res) => {
    const { customer_id, product, amount } = req.body as CreateOrderDto;

    if (!customer_id || !product || amount == null) {
        res.status(400).json({ error: 'customer_id, product, and amount are required' });
        return;
    }

    const safeAmount = Math.round(amount * 100) / 100;

    try {
        const { lastInsertRowid } = db
            .prepare('INSERT INTO orders (customer_id, product, amount) VALUES (?, ?, ?)')
            .run(customer_id, product, safeAmount);

        const created = db.prepare('SELECT * FROM orders WHERE id = ?').get(lastInsertRowid);
        res.status(201).json(created);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
            res.status(400).json({ error: `customer_id ${customer_id} does not exist — FK violation` });
            return;
        }
        throw err;
    }
}));

// PUT /api/orders/:id — full replace
ordersRouter.put('/:id', wrap(async (req, res) => {
    const { customer_id, product, amount, status } = req.body as CreateOrderDto & { status: string };
    const id = Number(req.params.id);

    if (!customer_id || !product || amount == null) {
        res.status(400).json({ error: 'PUT requires customer_id, product, and amount' });
        return;
    }

    const allowedStatus = ['pending', 'paid', 'cancelled'];
    if (status && !allowedStatus.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowedStatus.join(', ')}` });
        return;
    }

    const safeAmount = Math.round(amount * 100) / 100;

    try {
        db.prepare(`UPDATE orders SET customer_id = ?, product = ?, amount = ?, status = ? WHERE id = ?`)
            .run(customer_id, product, safeAmount, status ?? 'pending', id);

        const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        if (!updated) { res.status(404).json({ error: 'Order not found' }); return; }

        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
            res.status(400).json({ error: `customer_id ${customer_id} does not exist — FK violation` });
            return;
        }
        throw err;
    }
}));

// PATCH /api/orders/:id — partial update
ordersRouter.patch('/:id', wrap(async (req, res) => {
    const { customer_id, product, amount, status } = req.body as Partial<CreateOrderDto & { status: string }>;
    const id = Number(req.params.id);

    const allowedStatus = ['pending', 'paid', 'cancelled'];
    if (status && !allowedStatus.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowedStatus.join(', ')}` });
        return;
    }

    const fields: string[] = [];
    const values: import('sql.js').SqlValue[] = [];

    if (customer_id != null) { fields.push('customer_id = ?'); values.push(customer_id); }
    if (product)             { fields.push('product = ?');     values.push(product); }
    if (amount != null)      { fields.push('amount = ?');      values.push(Math.round(amount * 100) / 100); }
    if (status)              { fields.push('status = ?');      values.push(status); }

    if (fields.length === 0) {
        res.status(400).json({ error: 'PATCH requires at least one field' });
        return;
    }

    values.push(id);

    try {
        db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        if (!updated) { res.status(404).json({ error: 'Order not found' }); return; }

        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
            res.status(400).json({ error: 'customer_id does not exist — FK violation' });
            return;
        }
        throw err;
    }
}));

// DELETE /api/orders/:id
ordersRouter.delete('/:id', wrap(async (req, res) => {
    const { changes } = db
        .prepare('DELETE FROM orders WHERE id = ?')
        .run(Number(req.params.id));

    if (changes === 0) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json({ message: 'Order deleted' });
}));