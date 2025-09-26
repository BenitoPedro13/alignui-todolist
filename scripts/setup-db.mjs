#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env.local');
const defaultDbUrl = 'file:./data/todos.db';

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message, stderr) {
  process.stderr.write(`Error: ${message}\n`);
  if (stderr && stderr.length) {
    process.stderr.write(stderr.toString());
  }
  process.exit(1);
}

function ensureSqliteInstalled() {
  const result = spawnSync('sqlite3', ['--version'], { stdio: 'pipe' });
  if (result.error || result.status !== 0) {
    fail('`sqlite3` CLI not found. Install SQLite and rerun `pnpm run setup:db`.', result.stderr);
  }
  log(`sqlite3 ${result.stdout.toString().trim()} detected.`);
}

function ensureEnvFile() {
  if (!existsSync(envPath)) {
    log('Creating .env.local with default DATABASE_URL.');
    writeFileSync(envPath, `DATABASE_URL=${defaultDbUrl}\n`, 'utf-8');
    return defaultDbUrl;
  }

  const contents = readFileSync(envPath, 'utf-8');
  const dbLine = contents.split(/\r?\n/).find((line) => line.startsWith('DATABASE_URL='));
  if (dbLine && dbLine.includes('=')) {
    const value = dbLine.split('=').slice(1).join('=').trim();
    return value || defaultDbUrl;
  }

  log('DATABASE_URL missing in .env.local. Appending default value.');
  const needsNewline = contents.length && !contents.endsWith('\n');
  const updated = `${contents}${needsNewline ? '\n' : ''}DATABASE_URL=${defaultDbUrl}\n`;
  writeFileSync(envPath, updated, 'utf-8');
  return defaultDbUrl;
}

function resolveDatabasePath(databaseUrl) {
  const cleaned = databaseUrl.replace(/^file:/, '').replace(/^sqlite:/, '');
  const relative = cleaned || './data/todos.db';
  const absolute = path.resolve(projectRoot, relative);
  return { relative: path.relative(projectRoot, absolute), absolute };
}

function ensureDatabaseFile(dbAbsolutePath) {
  const dir = path.dirname(dbAbsolutePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    log(`Created directory ${path.relative(projectRoot, dir)}`);
  }

  const result = spawnSync('sqlite3', [dbAbsolutePath, '.databases'], { stdio: 'pipe' });
  if (result.status !== 0) {
    fail('Failed to create or open the SQLite database file.', result.stderr);
  }
  log(`Database ready at ${path.relative(projectRoot, dbAbsolutePath)}`);
}

function runMigrations(dbAbsolutePath) {
  const migrationsDir = path.join(projectRoot, 'src', 'db', 'migrations');
  if (!existsSync(migrationsDir)) {
    return;
  }

  const migrations = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!migrations.length) {
    return;
  }

  log(`Applying ${migrations.length} migration${migrations.length === 1 ? '' : 's'}:`);
  for (const file of migrations) {
    const fullPath = path.join(migrationsDir, file);
    log(`  • ${file}`);
    const result = spawnSync('sqlite3', ['-batch', dbAbsolutePath, `.read "${fullPath}"`], {
      stdio: 'inherit'
    });
    if (result.status !== 0) {
      fail(`Migration ${file} failed.`, result.stderr);
    }
  }
}

function main() {
  log('Setting up SQLite database...');
  ensureSqliteInstalled();
  const dbUrl = ensureEnvFile();
  const { absolute, relative } = resolveDatabasePath(dbUrl);
  log(`Using DATABASE_URL=${dbUrl}`);
  ensureDatabaseFile(absolute);
  runMigrations(absolute);
  log('Database setup complete. You can now run `pnpm dev`.');
}

main();
