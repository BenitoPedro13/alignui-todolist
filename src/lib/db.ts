import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(modulePath);
const MIGRATION_FILE = path.resolve(moduleDir, '../db/migrations/0001_init.sql');

const TURSO_DATABASE_URL =
  process.env.TURSO_DATABASE_URL ?? process.env.benito_TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN =
  process.env.TURSO_AUTH_TOKEN ?? process.env.benito_TURSO_AUTH_TOKEN;

let client: Client | null = null;
let migrationsPromise: Promise<void> | null = null;
let cachedSchemaSql: string | null | undefined;

const readSchemaSql = (): string | null => {
  if (cachedSchemaSql !== undefined) {
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

const runMigrations = async (dbClient: Client) => {
  const schemaSql = readSchemaSql();
  if (!schemaSql) {
    return;
  }

  const statements = schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((sql) => ({ sql }));

  if (statements.length === 0) {
    return;
  }

  for (const { sql } of statements) {
    if (sql.length === 0) {
      continue;
    }
    await dbClient.execute(sql);
  }
};

export const getClient = async (): Promise<Client> => {
  if (!TURSO_DATABASE_URL) {
    throw new Error(
      'Missing TURSO_DATABASE_URL environment variable. Set it in your environment or .env file.',
    );
  }

  if (!client) {
    client = createClient({
      url: TURSO_DATABASE_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }

  if (!migrationsPromise) {
    migrationsPromise = runMigrations(client);
  }

  await migrationsPromise;
  return client;
};

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedPath === modulePath) {
  (async () => {
    const dbClient = await getClient();
    const result = await dbClient.execute("SELECT datetime('now') AS now");
    const now = result.rows[0]?.now ?? 'unknown';
    process.stdout.write(`Connected to Turso database at ${TURSO_DATABASE_URL}\n`);
    process.stdout.write(`Server time: ${now}\n`);
  })().catch((error) => {
    process.stderr.write(`Failed to initialize database connection: ${error.message}\n`);
    process.exit(1);
  });
}
