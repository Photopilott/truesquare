import { readFile, writeFile } from 'node:fs/promises';

import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL_UNPOOLED ??
  process.env.truesquaresql_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const apply = process.argv.includes('--apply');
const includeOsm = process.argv.includes('--include-osm');
const outputUrl = new URL(
  '../data/atlas-project-coordinates.json',
  import.meta.url,
);
const sql = neon(databaseUrl);

const [target] = await sql`
  select
    current_database() as database_name,
    current_schema() as schema_name,
    to_regclass('public.atlas_projects')::text as atlas_table
`;
if (
  target.database_name !== 'neondb' ||
  target.schema_name !== 'public' ||
  target.atlas_table !== 'atlas_projects'
) {
  throw new Error(
    `Refusing to use an unrecognized database target: ${JSON.stringify(target)}`,
  );
}

const allProjects = await sql`
  select
    id,
    name,
    address,
    taluk,
    enrichment_source_url,
    latitude,
    longitude
  from public.atlas_projects
  order by id
`;
const projects = allProjects.filter(
  (project) => project.latitude == null || project.longitude == null,
);

let cached = [];
try {
  cached = JSON.parse(await readFile(outputUrl, 'utf8'));
} catch {}
const coordinatesById = new Map(cached.map((row) => [Number(row.id), row]));

function validCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= 12.3 &&
    latitude <= 13.6 &&
    longitude >= 77.1 &&
    longitude <= 78.2
  );
}

function findGeo(value) {
  if (!value || typeof value !== 'object') return null;
  if (
    value['@type'] === 'GeoCoordinates' &&
    value.latitude != null &&
    value.longitude != null
  ) {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);
    return validCoordinate(latitude, longitude)
      ? { latitude, longitude }
      : null;
  }
  for (const child of Object.values(value)) {
    const found = findGeo(child);
    if (found) return found;
  }
  return null;
}

function coordinatesFromHtml(html) {
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const found = findGeo(JSON.parse(match[1]));
      if (found) return found;
    } catch {}
  }
  return null;
}

async function fetchHorizon(project) {
  let error = 'coordinates missing';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(project.enrichment_source_url, {
        headers: {
          'user-agent': 'FlatData-Atlas-coordinate-import/1.0',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        error = `HTTP ${response.status}`;
      } else {
        const coordinates = coordinatesFromHtml(await response.text());
        if (coordinates) {
          return {
            id: Number(project.id),
            ...coordinates,
            source: 'Horizon project record',
            sourceUrl: project.enrichment_source_url,
          };
        }
      }
    } catch (caught) {
      error = caught?.message ?? String(caught);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  return { id: Number(project.id), error };
}

async function save() {
  const rows = [...coordinatesById.values()]
    .filter((row) => row.latitude != null && row.longitude != null)
    .sort((a, b) => a.id - b.id);
  await writeFile(outputUrl, `${JSON.stringify(rows)}\n`);
}

const horizonPending = projects.filter(
  (project) =>
    project.enrichment_source_url &&
    coordinatesById.get(Number(project.id))?.latitude == null,
);
let nextIndex = 0;
let horizonCompleted = 0;

async function horizonWorker() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= horizonPending.length) return;
    const project = horizonPending[index];
    const result = await fetchHorizon(project);
    coordinatesById.set(Number(project.id), result);
    horizonCompleted += 1;
    if (horizonCompleted % 100 === 0) {
      await save();
      console.log(
        JSON.stringify({
          source: 'Horizon',
          completed: horizonCompleted,
          remaining: horizonPending.length - horizonCompleted,
        }),
      );
    }
  }
}

await Promise.all(Array.from({ length: 12 }, () => horizonWorker()));
await save();

function normalized(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function addCandidate(index, key, latitude, longitude) {
  if (!key || key.length < 6 || !validCoordinate(latitude, longitude)) return;
  const coordinates = `${latitude},${longitude}`;
  const entries = index.get(key) ?? new Map();
  entries.set(coordinates, { latitude, longitude });
  index.set(key, entries);
}

const addressCandidates = new Map();
const nameCandidates = new Map();
for (const project of allProjects) {
  const cachedRow = coordinatesById.get(Number(project.id));
  const latitude = Number(cachedRow?.latitude ?? project.latitude);
  const longitude = Number(cachedRow?.longitude ?? project.longitude);
  addCandidate(
    addressCandidates,
    normalized(project.address),
    latitude,
    longitude,
  );
  addCandidate(
    nameCandidates,
    `${normalized(project.name)}:${normalized(project.taluk)}`,
    latitude,
    longitude,
  );
}

for (const project of projects) {
  const cachedRow = coordinatesById.get(Number(project.id));
  if (cachedRow?.latitude != null) continue;
  const addressMatches = addressCandidates.get(normalized(project.address));
  const nameMatches = nameCandidates.get(
    `${normalized(project.name)}:${normalized(project.taluk)}`,
  );
  const matches =
    addressMatches?.size === 1
      ? addressMatches
      : nameMatches?.size === 1
        ? nameMatches
        : null;
  if (!matches) continue;
  const [coordinates] = matches.values();
  coordinatesById.set(Number(project.id), {
    id: Number(project.id),
    ...coordinates,
    source:
      addressMatches?.size === 1
        ? 'Exact Atlas address match'
        : 'Exact Atlas project-name match',
  });
}
await save();

function nominatimQueries(project) {
  const area = [project.taluk, 'Karnataka', 'India'].filter(Boolean).join(', ');
  return [
    [project.name, project.address, area].filter(Boolean).join(', '),
    project.address
      ? [project.address, 'Bengaluru', 'Karnataka', 'India'].join(', ')
      : null,
    [project.name, area].filter(Boolean).join(', '),
  ].filter((query, index, values) => query && values.indexOf(query) === index);
}

async function fetchNominatim(project) {
  for (const query of nominatimQueries(project)) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'in');
    url.searchParams.set('viewbox', '77.1,13.6,78.2,12.3');
    url.searchParams.set('bounded', '1');
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'FlatData-Atlas-coordinate-import/1.0',
          referer: 'https://www.flatdata.in/',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) {
        const [result] = await response.json();
        const latitude = Number(result?.lat);
        const longitude = Number(result?.lon);
        if (validCoordinate(latitude, longitude)) {
          return {
            id: Number(project.id),
            latitude,
            longitude,
            source: 'OpenStreetMap Nominatim address match',
            sourceUrl: 'https://nominatim.openstreetmap.org/',
            query,
          };
        }
      } else if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return { id: Number(project.id), error: 'no bounded address match' };
}

if (includeOsm) {
  const osmPending = projects.filter((project) => {
    const cachedRow = coordinatesById.get(Number(project.id));
    return !cachedRow?.latitude;
  });
  for (let index = 0; index < osmPending.length; index += 1) {
    const project = osmPending[index];
    coordinatesById.set(Number(project.id), await fetchNominatim(project));
    await save();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    console.log(
      JSON.stringify({
        source: 'OpenStreetMap',
        completed: index + 1,
        remaining: osmPending.length - index - 1,
      }),
    );
  }
}

const resolved = projects
  .map((project) => coordinatesById.get(Number(project.id)))
  .filter((row) => row?.latitude != null && row?.longitude != null);
const unresolved = projects.filter((project) => {
  const row = coordinatesById.get(Number(project.id));
  return row?.latitude == null || row?.longitude == null;
});

if (apply) {
  const updates = resolved.map(
    (row) => sql`
      update public.atlas_projects
      set
        latitude = ${row.latitude},
        longitude = ${row.longitude},
        updated_at = now()
      where id = ${row.id}
        and (latitude is null or longitude is null)
    `,
  );
  for (let index = 0; index < updates.length; index += 25) {
    await sql.transaction(updates.slice(index, index + 25));
  }
}

console.log(
  JSON.stringify(
    {
      target,
      missingBefore: projects.length,
      fetched: resolved.length,
      unresolved: unresolved.length,
      applied: apply ? resolved.length : 0,
      unresolvedProjects: unresolved.slice(0, 20).map((project) => ({
        id: Number(project.id),
        name: project.name,
        address: project.address,
      })),
    },
    null,
    2,
  ),
);
