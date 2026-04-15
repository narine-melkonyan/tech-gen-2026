import initSqlJs, { Database, BindParams, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../shop.db');

let _db: Database;

function saveDb() {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function bindAndRun(sql: string, params: SqlValue[]) {
    if (params.length > 0) {
        _db.run(sql, params as BindParams);
    } else {
        _db.run(sql);
    }
}

function getRows(sql: string, params: SqlValue[]): Record<string, unknown>[] {
    const stmt = _db.prepare(sql);
    try {
        if (params.length > 0) stmt.bind(params as BindParams);
        const rows: Record<string, unknown>[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
        return rows;
    } finally {
        stmt.free();
    }
}

function getDb() {
    return {
        prepare(sql: string) {
            return {
                run(...params: SqlValue[]) {
                    try {
                        bindAndRun(sql, params);
                        saveDb();
                        const result = _db.exec('SELECT last_insert_rowid() AS id, changes() AS cnt');
                        const vals   = result[0]?.values[0];
                        return {
                            lastInsertRowid: vals ? Number(vals[0]) : 0,
                            changes:         vals ? Number(vals[1]) : 0,
                        };
                    } catch (err) {
                        console.error('DB run error:', err);
                        throw err;
                    }
                },

                get(...params: SqlValue[]) {
                    try {
                        const rows = getRows(sql, params);
                        return rows[0] ?? undefined;
                    } catch (err) {
                        console.error('DB get error:', err);
                        throw err;
                    }
                },

                all(...params: SqlValue[]) {
                    try {
                        return getRows(sql, params);
                    } catch (err) {
                        console.error('DB all error:', err);
                        throw err;
                    }
                },
            };
        },

        exec(sql: string) {
            try {
                _db.run(sql);
                saveDb();
            } catch (err) {
                console.error('DB exec error:', err);
                throw err;
            }
        },

        pragma(sql: string) {
            _db.run(`PRAGMA ${sql}`);
        },
    };
}

export let db: ReturnType<typeof getDb>;

export async function initDb(): Promise<void> {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        _db = new SQL.Database(fileBuffer);
        console.log('✅ Loaded existing DB from', DB_PATH);
    } else {
        _db = new SQL.Database();
        console.log('✅ Created new DB at', DB_PATH);
    }

    db = getDb();
    db.pragma('foreign_keys = ON');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    _db.run(schema);
    saveDb();

    const result = _db.exec('SELECT COUNT(*) AS n FROM customers');
    const count  = Number(result[0]?.values[0][0] ?? 0);

    if (count === 0) {
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        _db.run(seed);
        saveDb();
        console.log('✅ DB seeded with sample data');
    }

    console.log('✅ DB ready —', count, 'existing customer(s)');
}