import DatabaseConstructor, { Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB_URL = 'file:./data/todos.db';
let connection: Database | null = null;
const modulePath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(modulePath);
const MIGRATION_FILE = path.resolve(moduleDir, '../db/migrations/0001_init.sql');
let cachedSchemaSql: string | null = null;

const normalizeDatabasePath = (databaseUrl: string): string => {
  const withoutScheme = databaseUrl.replace(/^sqlite:/i, '').replace(/^file:/i, '');
  const cleaned = withoutScheme.length ? withoutScheme : './data/todos.db';
  const absolutePath = path.isAbsolute(cleaned)
    ? cleaned
    : path.resolve(process.cwd(), cleaned);
  return absolutePath;
};

const readSchemaSql = (): string | null => {
  if (cachedSchemaSql !== null) {
    return cachedSchemaSql;
  }

  if (!fs.existsSync(MIGRATION_FILE)) {
    cachedSchemaSql = null;
    return cachedSchemaSql;
  }

  const contents = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  cachedSchemaSql = contents.trim().length ? contents : null;
  return cachedSchemaSql;
};

const ensureSchema = (db: Database) => {
  const schemaSql = readSchemaSql();
  if (!schemaSql) {
    return;
  }

  db.exec(schemaSql);
};

export const getDatabase = (): Database => {
  if (connection) {
    return connection;
  }

  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DB_URL;
  const databasePath = normalizeDatabasePath(databaseUrl);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new DatabaseConstructor(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  ensureSchema(db);

  connection = db;
  return connection;
};

export const initializeDatabase = (): Database => getDatabase();

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === modulePath) {
  const db = initializeDatabase();
  const databaseList = db.pragma('database_list');
  const file = Array.isArray(databaseList) && databaseList[0]
    ? (databaseList[0] as { file?: string }).file ?? 'unknown'
    : 'unknown';
  process.stdout.write(`Database initialized at ${file}\n`);
  db.close();
}
