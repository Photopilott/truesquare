import { readFile } from 'node:fs/promises';

import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL_UNPOOLED ??
  process.env.truesquaresql_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const atlas = JSON.parse(
  await readFile(
    new URL('../data/atlas-project-data.json', import.meta.url),
    'utf8',
  ),
);
const enrichment = JSON.parse(
  await readFile(
    new URL('../data/atlas-project-enrichment.json', import.meta.url),
    'utf8',
  ),
);
const enrichmentById = new Map(enrichment.map((row) => [row.atlasId, row]));

if (atlas.projects.length !== 2369) {
  throw new Error(
    `Expected 2369 Atlas projects, found ${atlas.projects.length}.`,
  );
}
if (
  new Set(atlas.projects.map((project) => project.id)).size !==
  atlas.projects.length
) {
  throw new Error('Atlas project IDs are not unique.');
}
if (enrichment.length !== 2271) {
  throw new Error(
    `Expected 2271 exact RERA matches, found ${enrichment.length}.`,
  );
}
for (const row of enrichment) {
  const project = atlas.projects.find(
    (candidate) => candidate.id === row.atlasId,
  );
  if (!project)
    throw new Error(`Enrichment refers to missing Atlas ID ${row.atlasId}.`);
  if (
    project.registration !== row.registration ||
    row.matchMethod !== 'registration'
  ) {
    throw new Error(`Non-exact enrichment match for Atlas ID ${row.atlasId}.`);
  }
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

const queries = atlas.projects.map((project) => {
  const added = enrichmentById.get(project.id);
  return sql`
    insert into public.atlas_projects (
      id,
      registration,
      name,
      builder,
      named_developer,
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
      ${project.id},
      ${project.registration},
      ${project.name},
      ${project.builder},
      ${project.builder},
      ${added?.constructionProgress ?? project.status},
      ${project.taluk},
      ${project.address},
      ${project.lat},
      ${project.lon},
      ${project.market},
      ${project.market_confidence},
      ${project.target},
      ${project.actual_completion},
      ${project.start},
      ${project.description},
      ${project.delivery},
      ${project.delivery_variance_days},
      ${added?.flatsOrUnits ?? project.units},
      ${project.complaints},
      ${added?.landAreaSqM ?? project.land_sqm},
      ${added?.coveredAreaSqM ?? project.covered_sqm},
      ${added?.openAreaSqM ?? project.open_sqm},
      ${added?.towers ?? null},
      ${added?.floors ?? null},
      ${added?.builtUpAreaSqM ?? null},
      ${added?.constructionProgress ?? null},
      ${added?.planningAuthority ?? null},
      ${added?.sourceUrl ?? null},
      ${added?.matchMethod ?? null},
      ${added?.researchStatus ?? 'No exact RERA match in enrichment source'},
      ${project.airport_km},
      ${project.nearby_count},
      ${JSON.stringify(project.nearby_names)}::jsonb,
      ${project.builder_projects},
      ${project.builder_on_time_rate},
      ${project.builder_complaints},
      ${project.schools},
      ${project.hospitals},
      ${project.malls},
      ${project.metro},
      ${project.metro_km},
      ${JSON.stringify(project.inventory)}::jsonb,
      now(),
      now()
    )
    on conflict (id) do update set
      registration = excluded.registration,
      name = excluded.name,
      builder = excluded.builder,
      named_developer = excluded.named_developer,
      status = excluded.status,
      taluk = excluded.taluk,
      address = excluded.address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      market = excluded.market,
      market_confidence = excluded.market_confidence,
      target_date = excluded.target_date,
      actual_completion_date = excluded.actual_completion_date,
      start_date = excluded.start_date,
      description = excluded.description,
      delivery = excluded.delivery,
      delivery_variance_days = excluded.delivery_variance_days,
      units = excluded.units,
      complaints = excluded.complaints,
      land_sqm = excluded.land_sqm,
      covered_sqm = excluded.covered_sqm,
      open_sqm = excluded.open_sqm,
      towers = excluded.towers,
      floors = excluded.floors,
      built_up_sqm = excluded.built_up_sqm,
      construction_progress = excluded.construction_progress,
      planning_authority = excluded.planning_authority,
      enrichment_source_url = excluded.enrichment_source_url,
      enrichment_match_method = excluded.enrichment_match_method,
      enrichment_research_status = excluded.enrichment_research_status,
      airport_km = excluded.airport_km,
      nearby_count = excluded.nearby_count,
      nearby_names = excluded.nearby_names,
      builder_projects = excluded.builder_projects,
      builder_on_time_rate = excluded.builder_on_time_rate,
      builder_complaints = excluded.builder_complaints,
      schools = excluded.schools,
      hospitals = excluded.hospitals,
      malls = excluded.malls,
      metro = excluded.metro,
      metro_km = excluded.metro_km,
      inventory = excluded.inventory,
      updated_at = now()
  `;
});

for (let index = 0; index < queries.length; index += 25) {
  await sql.transaction(queries.slice(index, index + 25));
}

const [verification] = await sql`
  select
    count(*)::int as rows,
    count(*) filter (where enrichment_match_method = 'registration')::int as exact_matches,
    count(towers)::int as towers,
    count(land_sqm)::int as land_area,
    count(floors)::int as floors,
    count(built_up_sqm)::int as built_up_area,
    count(covered_sqm)::int as covered_area,
    count(open_sqm)::int as open_area,
    count(construction_progress)::int as construction_progress,
    count(units)::int as units,
    count(planning_authority)::int as planning_authority
  from public.atlas_projects
`;
console.log(JSON.stringify({ target, verification }, null, 2));
