import { neon } from '@neondatabase/serverless';

const databaseUrl =
  process.env.truesquaresql_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Database URL is missing.');

const sql = neon(databaseUrl);

const focus = await sql`
  SELECT builder, COUNT(*)::int AS projects
  FROM atlas_projects
  WHERE builder ILIKE ANY(ARRAY['%prestige%', '%sobha%', '%assetz%', '%mythri%', '%mythreyi%'])
  GROUP BY builder
  ORDER BY lower(builder), projects DESC
`;

const caseVariants = await sql`
  SELECT lower(regexp_replace(trim(builder), '\\s+', ' ', 'g')) AS normalized,
         COUNT(DISTINCT builder)::int AS variants,
         SUM(projects)::int AS projects,
         json_agg(json_build_object('name', builder, 'projects', projects) ORDER BY projects DESC, builder) AS names
  FROM (
    SELECT builder, COUNT(*)::int AS projects
    FROM atlas_projects
    GROUP BY builder
  ) grouped
  GROUP BY lower(regexp_replace(trim(builder), '\\s+', ' ', 'g'))
  HAVING COUNT(DISTINCT builder) > 1
  ORDER BY projects DESC, normalized
`;

const topBuilders = await sql`
  SELECT builder, COUNT(*)::int AS projects
  FROM atlas_projects
  GROUP BY builder
  ORDER BY projects DESC, builder
  LIMIT 100
`;

console.log(JSON.stringify({ focus, caseVariants, topBuilders }, null, 2));
