import { readFile } from 'node:fs/promises';

import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL_UNPOOLED ??
  process.env.truesquaresql_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const rows = JSON.parse(
  await readFile(
    new URL('../data/atlas-workbook-only-projects.json', import.meta.url),
    'utf8',
  ),
);
if (rows.length !== 2348) {
  throw new Error(
    `Expected 2348 workbook-only projects, found ${rows.length}.`,
  );
}
if (new Set(rows.map((row) => row.id)).size !== rows.length) {
  throw new Error('Workbook-only Atlas IDs are not unique.');
}
if (new Set(rows.map((row) => row.registration)).size !== rows.length) {
  throw new Error('Workbook-only RERA registrations are not unique.');
}

const sql = neon(databaseUrl);
const [target] = await sql`
  select
    current_database() as database_name,
    current_schema() as schema_name,
    to_regclass('public.bangalore_flat_inventory')::text as inventory_table,
    to_regclass('public.purchase_contributions')::text as contribution_table,
    to_regclass('public.atlas_projects')::text as atlas_table
`;
if (
  target.database_name !== 'neondb' ||
  target.schema_name !== 'public' ||
  target.inventory_table !== 'bangalore_flat_inventory' ||
  target.contribution_table !== 'purchase_contributions' ||
  target.atlas_table !== 'atlas_projects'
) {
  throw new Error(
    `Refusing to seed an unrecognized database target: ${JSON.stringify(target)}`,
  );
}

const existing = await sql`
  select id, registration
  from public.atlas_projects
`;
const existingById = new Map(existing.map((row) => [row.id, row.registration]));
const existingByRegistration = new Map(
  existing.map((row) => [row.registration, row.id]),
);
const pending = [];
for (const row of rows) {
  const registrationAtId = existingById.get(row.id);
  const idAtRegistration = existingByRegistration.get(row.registration);
  if (registrationAtId && registrationAtId !== row.registration) {
    throw new Error(`Atlas ID collision at ${row.id}.`);
  }
  if (idAtRegistration && idAtRegistration !== row.id) {
    throw new Error(`RERA registration collision at ${row.registration}.`);
  }
  if (!registrationAtId && !idAtRegistration) pending.push(row);
}

const queries = pending.map(
  (row) => sql`
  insert into public.atlas_projects (
    id,
    registration,
    name,
    builder,
    status,
    taluk,
    address,
    latitude,
    longitude,
    market,
    market_confidence,
    target_date,
    actual_completion_date,
    start_date,
    description,
    delivery,
    delivery_variance_days,
    units,
    complaints,
    land_sqm,
    covered_sqm,
    open_sqm,
    towers,
    floors,
    built_up_sqm,
    construction_progress,
    planning_authority,
    enrichment_source_url,
    enrichment_match_method,
    enrichment_research_status,
    airport_km,
    nearby_count,
    nearby_names,
    builder_projects,
    builder_on_time_rate,
    builder_complaints,
    schools,
    hospitals,
    malls,
    metro,
    metro_km,
    inventory,
    imported_at,
    updated_at
  ) values (
    ${row.id},
    ${row.registration},
    ${row.name},
    ${row.builder},
    ${row.status},
    ${row.taluk},
    ${row.address},
    ${row.latitude},
    ${row.longitude},
    ${row.market},
    ${row.marketConfidence},
    ${row.targetDate},
    ${row.actualCompletionDate},
    ${row.startDate},
    ${row.description},
    ${row.delivery},
    ${row.deliveryVarianceDays},
    ${row.units},
    ${row.complaints},
    ${row.landSqm},
    ${row.coveredSqm},
    ${row.openSqm},
    ${row.towers},
    ${row.floors},
    ${row.builtUpSqm},
    ${row.constructionProgress},
    ${row.planningAuthority},
    ${row.enrichmentSourceUrl},
    ${row.enrichmentMatchMethod},
    ${row.enrichmentResearchStatus},
    ${row.airportKm},
    ${row.nearbyCount},
    ${JSON.stringify(row.nearbyNames)}::jsonb,
    ${row.builderProjects},
    ${row.builderOnTimeRate},
    ${row.builderComplaints},
    ${row.schools},
    ${row.hospitals},
    ${row.malls},
    ${row.metro},
    ${row.metroKm},
    ${JSON.stringify(row.inventory)}::jsonb,
    now(),
    now()
  )
`,
);

for (let index = 0; index < queries.length; index += 25) {
  await sql.transaction(queries.slice(index, index + 25));
}

const [verification] = await sql`
  select
    count(*)::int as total_rows,
    count(*) filter (where enrichment_match_method = 'registration')::int as original_enriched_rows,
    count(*) filter (where enrichment_match_method = 'new-registration')::int as added_rows,
    count(*) filter (where enrichment_match_method is null)::int as original_unmatched_rows
  from public.atlas_projects
`;
console.log(
  JSON.stringify(
    {
      target,
      rowsAlreadyPresent: rows.length - pending.length,
      inserted: pending.length,
      verification,
    },
    null,
    2,
  ),
);
