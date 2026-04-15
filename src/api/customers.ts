import { NextFunction, Request, Response, Router } from 'express';
import type { Customer, CreateCustomerDto } from '../models/customer';
import {db} from "../db/database";

export const customersRouter = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// GET /api/customers
customersRouter.get('/', wrap(async (_req, res) => {
    const customers = db.prepare('SELECT * FROM customers ORDER BY id').all() as unknown as Customer[];
    res.json(customers);
}));

// GET /api/customers/:id
customersRouter.get('/:id', wrap(async (req, res) => {
    const customer = db
        .prepare('SELECT * FROM customers WHERE id = ?')
        .get(Number(req.params.id)) as unknown as Customer | undefined;

    if (!customer) { res.status(404).json({ error: 'Customer not found' }); return; }

    const orders = db
        .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id')
        .all(Number(req.params.id));

    res.json({ customer, orders });
}));

// POST /api/customers — create
customersRouter.post('/', wrap(async (req, res) => {
    const { name, email } = req.body as CreateCustomerDto;

    if (!name || !email) {
        res.status(400).json({ error: 'name and email are required' });
        return;
    }

    try {
        const { lastInsertRowid } = db
            .prepare('INSERT INTO customers (name, email) VALUES (?, ?)')
            .run(name, email);

        const created = db
            .prepare('SELECT * FROM customers WHERE id = ?')
            .get(lastInsertRowid) as unknown as Customer;

        res.status(201).json(created);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE')) {
            res.status(409).json({ error: 'Email already exists — duplicate customer' });
            return;
        }
        throw err;
    }
}));

// PUT /api/customers/:id — full replace (name + email both required)
customersRouter.put('/:id', wrap(async (req, res) => {
    const { name, email } = req.body as CreateCustomerDto;
    const id = Number(req.params.id);

    if (!name || !email) {
        res.status(400).json({ error: 'PUT requires both name and email' });
        return;
    }

    try {
        db.prepare('UPDATE customers SET name = ?, email = ? WHERE id = ?').run(name, email, id);

        const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as unknown as Customer;
        if (!updated) { res.status(404).json({ error: 'Customer not found' }); return; }

        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE')) {
            res.status(409).json({ error: 'Email already exists' });
            return;
        }
        throw err;
    }
}));

// PATCH /api/customers/:id — partial update (name and/or email)
customersRouter.patch('/:id', wrap(async (req, res) => {
    const { name, email } = req.body as Partial<CreateCustomerDto>;
    const id = Number(req.params.id);

    if (!name && !email) {
        res.status(400).json({ error: 'PATCH requires at least one field: name or email' });
        return;
    }

    const fields: string[] = [];
    const values: import('sql.js').SqlValue[] = [];

    if (name)  { fields.push('name = ?');  values.push(name); }
    if (email) { fields.push('email = ?'); values.push(email); }

    values.push(id);

    try {
        db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as unknown as Customer;
        if (!updated) { res.status(404).json({ error: 'Customer not found' }); return; }

        res.json(updated);
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('UNIQUE')) {
            res.status(409).json({ error: 'Email already exists' });
            return;
        }
        throw err;
    }
}));

// DELETE /api/customers/:id
customersRouter.delete('/:id', wrap(async (req, res) => {
    try {
        const { changes } = db
            .prepare('DELETE FROM customers WHERE id = ?')
            .run(Number(req.params.id));

        if (changes === 0) { res.status(404).json({ error: 'Customer not found' }); return; }

        res.json({ message: 'Customer deleted' });
    } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('FOREIGN KEY')) {
            res.status(409).json({ error: 'Cannot delete customer with existing orders' });
            return;
        }
        throw err;
    }
}));