import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

const atlas = JSON.parse(
  await fs.readFile('data/atlas-project-data.json', 'utf8'),
);
const details = JSON.parse(
  await fs.readFile('../.work/project_details.json', 'utf8'),
);
const reraRows = JSON.parse(
  await fs.readFile('../.work/horizon-rera-ids.json', 'utf8'),
);
const registrationByUrl = new Map(
  reraRows.map((row) => [row.sourceUrl, row.registration]),
);
const atlasRegistrations = new Set(
  atlas.projects.map((project) => project.registration),
);
const reservedIds = new Set(atlas.projects.map((project) => project.id));

const sourceRows = details
  .map((detail) => ({
    ...detail,
    registration: registrationByUrl.get(detail.sourceUrl) ?? null,
  }))
  .filter(
    (detail) =>
      detail.registration && !atlasRegistrations.has(detail.registration),
  )
  .sort((a, b) => a.registration.localeCompare(b.registration));

if (sourceRows.length !== 2348) {
  throw new Error(
    `Expected 2348 workbook-only rows, found ${sourceRows.length}.`,
  );
}

function stableId(registration) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const hash = createHash('sha256')
      .update(`${registration}#${attempt}`)
      .digest();
    const id = 1_000_000_000 + (hash.readUInt32BE(0) % 1_000_000_000);
    if (!reservedIds.has(id)) {
      reservedIds.add(id);
      return id;
    }
  }
  throw new Error(`Could not assign a stable ID for ${registration}.`);
}

const combinedBuilderCounts = new Map();
for (const project of [...atlas.projects, ...sourceRows]) {
  const builder = project.builder ?? project.developer;
  combinedBuilderCounts.set(
    builder,
    (combinedBuilderCounts.get(builder) ?? 0) + 1,
  );
}

const rows = sourceRows.map((detail) => ({
  id: stableId(detail.registration),
  registration: detail.registration,
  name: detail.project,
  builder: detail.developer,
  status: detail.constructionProgress,
  taluk: detail.location,
  address: null,
  latitude: null,
  longitude: null,
  market: 'Needs review',
  marketConfidence: 0,
  targetDate: null,
  actualCompletionDate: null,
  startDate: null,
  description: null,
  delivery: 'not_yet_due_or_unknown',
  deliveryVarianceDays: null,
  units: detail.flatsOrUnits,
  complaints: null,
  landSqm: detail.landAreaSqM,
  coveredSqm: detail.coveredAreaSqM,
  openSqm: detail.openAreaSqM,
  towers: detail.towers,
  floors: detail.floors,
  builtUpSqm: detail.builtUpAreaSqM,
  constructionProgress: detail.constructionProgress,
  planningAuthority: detail.planningAuthority,
  enrichmentSourceUrl: detail.sourceUrl,
  enrichmentMatchMethod: 'new-registration',
  enrichmentResearchStatus: detail.researchStatus,
  airportKm: null,
  nearbyCount: null,
  nearbyNames: [],
  builderProjects: combinedBuilderCounts.get(detail.developer),
  builderOnTimeRate: null,
  builderComplaints: null,
  schools: null,
  hospitals: null,
  malls: null,
  metro: null,
  metroKm: null,
  inventory: [],
}));

if (new Set(rows.map((row) => row.id)).size !== rows.length) {
  throw new Error('Generated Atlas IDs are not unique.');
}
if (new Set(rows.map((row) => row.registration)).size !== rows.length) {
  throw new Error('Workbook-only registrations are not unique.');
}

await fs.writeFile(
  'data/atlas-workbook-only-projects.json',
  JSON.stringify(rows),
);

const fieldCounts = Object.fromEntries(
  [
    'towers',
    'landSqm',
    'floors',
    'builtUpSqm',
    'coveredSqm',
    'openSqm',
    'constructionProgress',
    'units',
    'planningAuthority',
  ].map((field) => [
    field,
    rows.filter((row) => row[field] !== null && row[field] !== '').length,
  ]),
);

console.log(
  JSON.stringify(
    {
      rows: rows.length,
      distinctIds: new Set(rows.map((row) => row.id)).size,
      distinctRegistrations: new Set(rows.map((row) => row.registration)).size,
      fieldCounts,
      first: rows[0],
      last: rows.at(-1),
    },
    null,
    2,
  ),
);
