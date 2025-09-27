#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getClient } from '../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');

const ENV_TEMPLATE = `# Turso connection
TURSO_DATABASE_URL=libsql://your-db-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token
`;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function ensureEnvFile() {
  if (!existsSync(envPath)) {
    log('Creating .env.local with Turso placeholders.');
    writeFileSync(envPath, ENV_TEMPLATE, 'utf-8');
    return;
  }

  const contents = readFileSync(envPath, 'utf-8');
  if (!/TURSO_DATABASE_URL=/.test(contents)) {
    log('Appending TURSO_* variables to existing .env.local.');
    const needsNewline = contents.length && !contents.endsWith('\n');
    const updated = `${contents}${needsNewline ? '\n' : ''}${ENV_TEMPLATE}`;
    writeFileSync(envPath, updated, 'utf-8');
  }
}

async function main() {
  log('Setting up Turso database connection...');
  ensureEnvFile();

  try {
    const client = await getClient();
    const result = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type = 'table'" });
    const tables = result.rows.map((row) => row.name).filter(Boolean);
    log('Connection successful. Tables available:');
    tables.forEach((table) => log(`  • ${table}`));
    if (!tables.length) {
      log('  (no tables found yet – migrations may not have run)');
    }
  } catch (error) {
    log('Failed to verify database connection.');
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.stderr.write(
      'Ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in .env.local.\n',
    );
    process.exit(1);
  }

  log('Database setup complete. You can now run `pnpm dev`.');
}

main();
