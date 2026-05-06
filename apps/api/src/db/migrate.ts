import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

const run = async () => {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const applied = await sql`SELECT 1 FROM _migrations WHERE name = ${file}`;
    if (applied.length > 0) {
      logger.info({ file }, 'migration already applied');
      continue;
    }
    const body = readFileSync(join(migrationsDir, file), 'utf8');
    logger.info({ file }, 'applying migration');
    await sql.unsafe(body);
    await sql`INSERT INTO _migrations (name) VALUES (${file})`;
  }
  await sql.end();
  logger.info('migrations complete');
};

run().catch((err) => {
  logger.error({ err }, 'migration failed');
  process.exit(1);
});
