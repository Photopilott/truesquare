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
const projectById = new Map(atlas.projects.map((row) => [row.id, row]));
const workbookOnly = JSON.parse(
  await readFile(
    new URL('../data/atlas-workbook-only-projects.json', import.meta.url),
    'utf8',
  ),
);
const workbookOnlyById = new Map(workbookOnly.map((row) => [row.id, row]));
const sql = neon(databaseUrl);

const [summary] = await sql`
  select
    count(*)::int as rows,
    count(distinct id)::int as distinct_ids,
    count(distinct registration)::int as distinct_registrations,
    count(*) filter (where enrichment_match_method = 'registration')::int as exact_matches,
    count(*) filter (where enrichment_match_method = 'new-registration')::int as added_rows,
    count(*) filter (where enrichment_match_method is null)::int as original_unmatched_rows,
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
const [unrelated] = await sql`
  select count(*)::int as bangalore_flat_inventory_rows
  from public.bangalore_flat_inventory
`;
const stored = await sql`
  select
    id,
    registration,
    status,
    towers,
    land_sqm,
    floors,
    built_up_sqm,
    covered_sqm,
    open_sqm,
    construction_progress,
    units,
    planning_authority,
    enrichment_source_url,
    enrichment_match_method
  from public.atlas_projects
  order by id
`;

function numeric(value) {
  return value == null ? null : Number(value);
}

const mismatches = [];
for (const row of stored) {
  const project = projectById.get(row.id);
  const added = enrichmentById.get(row.id);
  const newProject = workbookOnlyById.get(row.id);
  const expected = newProject
    ? {
        registration: newProject.registration,
        status: newProject.status,
        towers: newProject.towers,
        land_sqm: newProject.landSqm,
        floors: newProject.floors,
        built_up_sqm: newProject.builtUpSqm,
        covered_sqm: newProject.coveredSqm,
        open_sqm: newProject.openSqm,
        construction_progress: newProject.constructionProgress,
        units: newProject.units,
        planning_authority: newProject.planningAuthority,
        enrichment_source_url: newProject.enrichmentSourceUrl,
        enrichment_match_method: newProject.enrichmentMatchMethod,
      }
    : {
        registration: project?.registration ?? null,
        status: added?.constructionProgress ?? project?.status ?? null,
        towers: added?.towers ?? null,
        land_sqm: added?.landAreaSqM ?? project?.land_sqm ?? null,
        floors: added?.floors ?? null,
        built_up_sqm: added?.builtUpAreaSqM ?? null,
        covered_sqm: added?.coveredAreaSqM ?? project?.covered_sqm ?? null,
        open_sqm: added?.openAreaSqM ?? project?.open_sqm ?? null,
        construction_progress: added?.constructionProgress ?? null,
        units: added?.flatsOrUnits ?? project?.units ?? null,
        planning_authority: added?.planningAuthority ?? null,
        enrichment_source_url: added?.sourceUrl ?? null,
        enrichment_match_method: added?.matchMethod ?? null,
      };
  const actual = {
    registration: row.registration,
    status: row.status,
    towers: numeric(row.towers),
    land_sqm: numeric(row.land_sqm),
    floors: numeric(row.floors),
    built_up_sqm: numeric(row.built_up_sqm),
    covered_sqm: numeric(row.covered_sqm),
    open_sqm: numeric(row.open_sqm),
    construction_progress: row.construction_progress,
    units: row.units,
    planning_authority: row.planning_authority,
    enrichment_source_url: row.enrichment_source_url,
    enrichment_match_method: row.enrichment_match_method,
  };
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    mismatches.push({ id: row.id, expected, actual });
  }
}

if (
  summary.rows !== 4717 ||
  summary.distinct_ids !== 4717 ||
  summary.distinct_registrations !== 4717 ||
  summary.exact_matches !== 2271 ||
  summary.added_rows !== 2348 ||
  summary.original_unmatched_rows !== 98 ||
  unrelated.bangalore_flat_inventory_rows !== 418 ||
  mismatches.length
) {
  throw new Error(
    `Atlas verification failed: ${JSON.stringify({ summary, unrelated, mismatches: mismatches.slice(0, 5) })}`,
  );
}

console.log(
  JSON.stringify(
    {
      summary,
      unrelated,
      valueMismatches: mismatches.length,
      samples: stored.slice(0, 3),
    },
    null,
    2,
  ),
);
