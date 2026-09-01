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
const reraByUrl = new Map(
  reraRows.map((row) => [row.sourceUrl, row.registration]),
);

function key(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const byNameBuilder = new Map();
const byNameTaluk = new Map();
const byName = new Map();
const byRegistration = new Map();
for (const detail of details) {
  const registration = reraByUrl.get(detail.sourceUrl);
  if (registration) {
    const list = byRegistration.get(registration) ?? [];
    list.push(detail);
    byRegistration.set(registration, list);
  }
  const pairs = [
    [byNameBuilder, `${key(detail.project)}|${key(detail.developer)}`],
    [byNameTaluk, `${key(detail.project)}|${key(detail.location)}`],
    [byName, key(detail.project)],
  ];
  for (const [map, mapKey] of pairs) {
    const list = map.get(mapKey) ?? [];
    list.push(detail);
    map.set(mapKey, list);
  }
}

const matches = [];
const unmatched = [];
const ambiguous = [];
for (const project of atlas.projects) {
  const registrationCandidates = byRegistration.get(project.registration) ?? [];
  if (registrationCandidates.length === 1) {
    matches.push({
      project,
      detail: registrationCandidates[0],
      method: 'registration',
    });
    continue;
  }
  const candidates = [
    ['registration', registrationCandidates],
    [
      'name+builder',
      byNameBuilder.get(`${key(project.name)}|${key(project.builder)}`) ?? [],
    ],
    [
      'name+taluk',
      byNameTaluk.get(`${key(project.name)}|${key(project.taluk)}`) ?? [],
    ],
    ['unique-name', byName.get(key(project.name)) ?? []],
  ];
  const nonEmpty = candidates.filter(([, items]) => items.length > 0);
  if (nonEmpty.length) {
    ambiguous.push({
      id: project.id,
      registration: project.registration,
      name: project.name,
      builder: project.builder,
      candidates: nonEmpty.map(([method, items]) => ({
        method,
        count: items.length,
        examples: items.slice(0, 3).map((item) => ({
          project: item.project,
          developer: item.developer,
          location: item.location,
          sourceUrl: item.sourceUrl,
        })),
      })),
    });
  } else {
    unmatched.push({
      id: project.id,
      registration: project.registration,
      name: project.name,
      builder: project.builder,
      taluk: project.taluk,
    });
  }
}

const methodCounts = Object.fromEntries(
  ['registration', 'name+builder', 'name+taluk', 'unique-name'].map(
    (method) => [
      method,
      matches.filter((match) => match.method === method).length,
    ],
  ),
);
const output = matches.map(({ project, detail, method }) => ({
  atlasId: project.id,
  registration: project.registration,
  matchMethod: method,
  sourceUrl: detail.sourceUrl,
  towers: detail.towers,
  landAreaSqM: detail.landAreaSqM,
  floors: detail.floors,
  builtUpAreaSqM: detail.builtUpAreaSqM,
  coveredAreaSqM: detail.coveredAreaSqM,
  openAreaSqM: detail.openAreaSqM,
  constructionProgress: detail.constructionProgress,
  flatsOrUnits: detail.flatsOrUnits,
  planningAuthority: detail.planningAuthority,
  researchStatus: detail.researchStatus,
}));
await fs.writeFile(
  'data/atlas-project-enrichment.json',
  JSON.stringify(output),
);
await fs.writeFile(
  '../.work/atlas-enrichment-unmatched.json',
  JSON.stringify(unmatched, null, 2),
);
await fs.writeFile(
  '../.work/atlas-enrichment-ambiguous.json',
  JSON.stringify(ambiguous, null, 2),
);

console.log(
  JSON.stringify(
    {
      atlasProjects: atlas.projects.length,
      matched: matches.length,
      methodCounts,
      unmatched: unmatched.length,
      ambiguous: ambiguous.length,
      unmatchedExamples: unmatched.slice(0, 10),
      ambiguousExamples: ambiguous.slice(0, 5),
    },
    null,
    2,
  ),
);
