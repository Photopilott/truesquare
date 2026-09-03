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
const inventory = await sql`
  SELECT id, name, area
  FROM bangalore_flat_inventory
  WHERE active = TRUE
  ORDER BY name, area
`;
const identityKey = (value) =>
  value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
const locationKey = (value) => value.trim().toLowerCase();
const inventoryByName = new Map();
for (const society of inventory) {
  const key = identityKey(society.name);
  const matches = inventoryByName.get(key) ?? [];
  matches.push(society);
  inventoryByName.set(key, matches);
}

const preparedRecords = data.records.map((record) => {
  const matches = inventoryByName.get(identityKey(record.society)) ?? [];
  const inventoryMatch =
    matches.find(
      (society) => locationKey(society.area) === locationKey(record.location),
    ) ?? (matches.length === 1 ? matches[0] : null);
  return {
    ...record,
    flatInventoryId: inventoryMatch?.id ?? null,
    location: inventoryMatch?.area ?? record.location,
    society: inventoryMatch?.name ?? record.society,
  };
});

const queries = preparedRecords.map(
  (record) => sql`
  INSERT INTO registered_transactions (
    id,
    flat_inventory_id,
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
    ${record.flatInventoryId},
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
    flat_inventory_id = EXCLUDED.flat_inventory_id,
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
`,
);

for (let index = 0; index < queries.length; index += 40) {
  await sql.transaction(queries.slice(index, index + 40));
}

const finalValueQueries = preparedRecords
  .filter((record) => record.price != null)
  .map(
    (record) => sql`
    INSERT INTO final_flat_values (
      flat_inventory_id,
      source_type,
      registered_transaction_id,
      price,
      effective_area,
      price_per_sq_ft,
      bhk,
      value_date,
      society,
      location,
      source_url
    ) VALUES (
      ${record.flatInventoryId},
      'registered_transaction',
      ${record.id},
      ${record.price},
      ${record.effectiveArea},
      ${record.pricePerSqFt},
      ${record.bhk},
      ${record.registrationDate},
      ${record.society},
      ${record.location},
      ${record.sourceUrl}
    )
    ON CONFLICT (registered_transaction_id) DO UPDATE SET
      flat_inventory_id = EXCLUDED.flat_inventory_id,
      price = EXCLUDED.price,
      effective_area = EXCLUDED.effective_area,
      price_per_sq_ft = EXCLUDED.price_per_sq_ft,
      bhk = EXCLUDED.bhk,
      value_date = EXCLUDED.value_date,
      society = EXCLUDED.society,
      location = EXCLUDED.location,
      source_url = EXCLUDED.source_url,
      updated_at = NOW()
  `,
  );

for (let index = 0; index < finalValueQueries.length; index += 40) {
  await sql.transaction(finalValueQueries.slice(index, index + 40));
}

console.log(
  `Seeded ${preparedRecords.length} registered transactions with canonical society IDs.`,
);
