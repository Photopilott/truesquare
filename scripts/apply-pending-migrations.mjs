import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const dryRun = process.argv.includes('--dry-run');

const migrationDirectory = new URL('../drizzle/', import.meta.url);
const journal = JSON.parse(
  await readFile(new URL('meta/_journal.json', migrationDirectory), 'utf8'),
);
const sql = neon(databaseUrl);
const applied = await sql.query(
  'SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at',
);
const appliedHashes = new Set(applied.map((migration) => migration.hash));
const names = (await readdir(migrationDirectory)).filter((name) =>
  name.endsWith('.sql'),
);

for (const entry of journal.entries) {
  const fileName = `${entry.tag}.sql`;
  if (!names.includes(fileName)) continue;
  const filePath = join(migrationDirectory.pathname, fileName);
  const source = await readFile(filePath, 'utf8');
  const hash = createHash('sha256').update(source).digest('hex');
  if (appliedHashes.has(hash)) continue;

  if (dryRun) {
    console.log(`Pending ${entry.tag}.`);
    continue;
  }

  const statements = source
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter(Boolean);
  await sql.transaction((transaction) => [
    ...statements.map((statement) => transaction.query(statement)),
    transaction.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, entry.when],
    ),
  ]);
  console.log(`Applied ${entry.tag}.`);
}
