import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

export function getSql() {
  const databaseUrl =
    process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured.');
  return neon(databaseUrl);
}

export function getDb() {
  return drizzle({ client: getSql(), schema });
}

export function hasDatabase() {
  return Boolean(
    process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL,
  );
}
