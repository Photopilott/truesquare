import { readFile } from 'node:fs/promises';

import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const source = new URL('../data/property-data.json', import.meta.url);
const data = JSON.parse(await readFile(source, 'utf8'));
const sql = neon(databaseUrl);
const queries = data.records.map((record) => sql`
  INSERT INTO registered_transactions (
    id,
    location,
    society,
    tower,
    bhk,
    registration_date,
    raw_date,
    price,
    effective_area,
    price_per_sq_ft,
    area_basis,
    sale_type,
    qa_notes,
    source_file,
    source_url,
    imported_at
  ) VALUES (
    ${record.id},
    ${record.location},
    ${record.society},
    ${record.tower},
    ${record.bhk},
    ${record.registrationDate},
    ${record.rawDate},
    ${record.price},
    ${record.effectiveArea},
    ${record.pricePerSqFt},
    ${record.areaBasis},
    ${record.saleType},
    ${record.qaNotes},
    ${record.sourceFile},
    ${record.sourceUrl},
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    location = EXCLUDED.location,
    society = EXCLUDED.society,
    tower = EXCLUDED.tower,
    bhk = EXCLUDED.bhk,
    registration_date = EXCLUDED.registration_date,
    raw_date = EXCLUDED.raw_date,
    price = EXCLUDED.price,
    effective_area = EXCLUDED.effective_area,
    price_per_sq_ft = EXCLUDED.price_per_sq_ft,
    area_basis = EXCLUDED.area_basis,
    sale_type = EXCLUDED.sale_type,
    qa_notes = EXCLUDED.qa_notes,
    source_file = EXCLUDED.source_file,
    source_url = EXCLUDED.source_url,
    imported_at = NOW()
`);

for (let index = 0; index < queries.length; index += 40) {
  await sql.transaction(queries.slice(index, index + 40));
}

console.log(`Seeded ${data.records.length} registered transactions.`);
