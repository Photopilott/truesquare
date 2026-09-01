import { neon } from '@neondatabase/serverless';
import groupRules from '../data/atlas-developer-groups.json' with { type: 'json' };

const apply = process.argv.includes('--apply');
const summaryOnly = process.argv.includes('--summary-only');
const databaseUrl =
  process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Database URL is missing.');

const sql = neon(databaseUrl);

function cleanDisplayName(value) {
  return value
    .replace(/&#x20;|&#32;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .normalize('NFKC')
    .replace(/^m\s*[/.]?\s*s\s*[/.]?\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim();
}

export function developerEntityKey(value) {
  return cleanDisplayName(value)
    .toLowerCase()
    .replace(/^m\s*[/.]?\s*s\s*[/.]?\s+/, '')
    .replace(/&/g, ' and ')
    .replace(/\bpvt\b/g, 'private')
    .replace(/\bltd\b/g, 'limited')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const compiledRules = groupRules.map((rule) => ({
  ...rule,
  patterns: rule.patterns.map((pattern) => new RegExp(pattern, 'i')),
}));

function groupFor(key) {
  return compiledRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(key)),
  );
}

const rows = await sql`
  SELECT builder, COUNT(*)::int AS projects
  FROM atlas_projects
  GROUP BY builder
  ORDER BY builder
`;

const entities = new Map();
for (const row of rows) {
  const display = cleanDisplayName(row.builder);
  const key = developerEntityKey(display);
  const candidates = entities.get(key) ?? [];
  candidates.push({ name: display, projects: row.projects });
  entities.set(key, candidates);
}

const canonicalEntityNames = new Map();
for (const [key, candidates] of entities) {
  candidates.sort(
    (a, b) =>
      b.projects - a.projects ||
      Number(a.name === a.name.toUpperCase()) -
        Number(b.name === b.name.toUpperCase()) ||
      a.name.localeCompare(b.name),
  );
  canonicalEntityNames.set(key, candidates[0].name);
}

const assignments = rows.map((row) => {
  const builder = cleanDisplayName(row.builder);
  const key = developerEntityKey(builder);
  const group = groupFor(key);
  return {
    builder: row.builder,
    projects: row.projects,
    namedDeveloper: group?.name ?? canonicalEntityNames.get(key) ?? builder,
    method: group
      ? 'group-rule'
      : entities.get(key).length > 1
        ? 'normalized-entity'
        : 'unchanged',
  };
});

const grouped = new Map();
for (const assignment of assignments) {
  const current = grouped.get(assignment.namedDeveloper) ?? {
    namedDeveloper: assignment.namedDeveloper,
    projects: 0,
    builders: [],
    methods: new Set(),
  };
  current.projects += assignment.projects;
  current.builders.push(assignment.builder);
  current.methods.add(assignment.method);
  grouped.set(assignment.namedDeveloper, current);
}

if (apply) {
  const builderNames = assignments.map((item) => item.builder);
  const namedDevelopers = assignments.map((item) => item.namedDeveloper);
  await sql`
    UPDATE atlas_projects AS project
    SET named_developer = assignment.named_developer,
        updated_at = now()
    FROM unnest(
      ${builderNames}::text[],
      ${namedDevelopers}::text[]
    ) AS assignment(builder, named_developer)
    WHERE project.builder = assignment.builder
  `;
}

const result = {
  mode: apply ? 'applied' : 'dry-run',
  projects: rows.reduce((sum, row) => sum + row.projects, 0),
  rawBuilderNames: rows.length,
  namedDevelopers: grouped.size,
  reduction: rows.length - grouped.size,
  normalizedEntityVariants: assignments.filter(
    (item) => item.method === 'normalized-entity',
  ).length,
  groupedBuilderNames: assignments.filter(
    (item) => item.method === 'group-rule',
  ).length,
  groups: [...grouped.values()]
    .filter((group) => group.builders.length > 1)
    .sort(
      (a, b) =>
        b.projects - a.projects ||
        a.namedDeveloper.localeCompare(b.namedDeveloper),
    )
    .map((group) => ({
      namedDeveloper: group.namedDeveloper,
      projects: group.projects,
      builders: group.builders.sort((a, b) => a.localeCompare(b)),
      methods: [...group.methods].sort((a, b) => a.localeCompare(b)),
    })),
};

console.log(
  JSON.stringify(
    summaryOnly ? { ...result, groups: undefined } : result,
    null,
    2,
  ),
);
