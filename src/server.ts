import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { customersRouter } from './api/customers';
import { ordersRouter } from './api/orders';
import {initDb} from "./db/database";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../ui')));

app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);

// Lessons
app.get('/lessons/client-server', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../ui/client-server.html'));
});

// Global error handler — catches anything thrown in routes
// Without this, Express sends an empty 500 with nobody
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`   UI:  http://localhost:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api/customers`);
        console.log(`   API: http://localhost:${PORT}/api/orders`);
        console.log(`   QA:  http://localhost:${PORT}/api/orders/qa/orphans`);
        console.log(`   QA:  http://localhost:${PORT}/api/orders/qa/precision`);
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});