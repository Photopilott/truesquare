import 'server-only';

import { cache } from 'react';
import source from '@/data/atlas-project-data.json';
import { getSql, hasDatabase } from '@/db';
import {
  builderPortfolio,
  nearbyFilings,
  toFiling,
  type AtlasMarket,
  type Filing,
  type InventoryRow,
  type RawProject,
} from '@/lib/atlas-model';

type AtlasProjectRow = {
  id: number;
  registration: string;
  name: string;
  builder: string;
  named_developer: string;
  status: string | null;
  taluk: string | null;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  market: string;
  market_confidence: string | number;
  target_date: string | Date | null;
  actual_completion_date: string | Date | null;
  start_date: string | Date | null;
  description: string | null;
  delivery: string;
  delivery_variance_days: number | null;
  units: number | null;
  complaints: number | null;
  land_sqm: string | number | null;
  covered_sqm: string | number | null;
  open_sqm: string | number | null;
  towers: number | null;
  floors: number | null;
  built_up_sqm: string | number | null;
  construction_progress: string | null;
  planning_authority: string | null;
  enrichment_source_url: string | null;
  enrichment_research_status: string | null;
  airport_km: string | number | null;
  nearby_count: number | null;
  nearby_names: string[] | null;
  builder_projects: number;
  builder_on_time_rate: string | number | null;
  builder_complaints: number | null;
  schools: number | null;
  hospitals: number | null;
  malls: number | null;
  metro: string | null;
  metro_km: string | number | null;
  inventory: InventoryRow[] | null;
};

export type AtlasDataset = {
  filings: Filing[];
  markets: AtlasMarket[];
  source: 'database' | 'snapshot';
};

function numberOrNull(value: string | number | null) {
  return value == null ? null : Number(value);
}

function dateOrNull(value: string | Date | null) {
  if (value == null) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

export function atlasRowToProject(row: AtlasProjectRow): RawProject {
  return {
    id: row.id,
    registration: row.registration,
    name: row.name,
    builder: row.builder,
    named_developer: row.named_developer,
    status: row.status,
    taluk: row.taluk,
    address: row.address,
    lat: numberOrNull(row.latitude),
    lon: numberOrNull(row.longitude),
    market: row.market,
    market_confidence: Number(row.market_confidence),
    target: dateOrNull(row.target_date),
    actual_completion: dateOrNull(row.actual_completion_date),
    start: dateOrNull(row.start_date),
    description: row.description,
    delivery: row.delivery,
    delivery_variance_days: row.delivery_variance_days,
    units: row.units,
    complaints: row.complaints,
    land_sqm: numberOrNull(row.land_sqm),
    covered_sqm: numberOrNull(row.covered_sqm),
    open_sqm: numberOrNull(row.open_sqm),
    towers: row.towers,
    floors: row.floors,
    built_up_sqm: numberOrNull(row.built_up_sqm),
    construction_progress: row.construction_progress,
    planning_authority: row.planning_authority,
    enrichment_source_url: row.enrichment_source_url,
    enrichment_research_status: row.enrichment_research_status,
    airport_km: numberOrNull(row.airport_km),
    nearby_count: row.nearby_count,
    nearby_names: row.nearby_names ?? [],
    builder_projects: row.builder_projects,
    builder_on_time_rate: numberOrNull(row.builder_on_time_rate),
    builder_complaints: row.builder_complaints,
    schools: row.schools,
    hospitals: row.hospitals,
    malls: row.malls,
    metro: row.metro,
    metro_km: numberOrNull(row.metro_km),
    inventory: row.inventory ?? [],
  };
}

function snapshotProjects() {
  return (
    source.projects as Omit<
      RawProject,
      | 'named_developer'
      | 'towers'
      | 'floors'
      | 'built_up_sqm'
      | 'construction_progress'
      | 'planning_authority'
      | 'enrichment_source_url'
      | 'enrichment_research_status'
    >[]
  ).map((project) => ({
    ...project,
    named_developer: project.builder,
    towers: null,
    floors: null,
    built_up_sqm: null,
    construction_progress: project.status,
    planning_authority: null,
    enrichment_source_url: null,
    enrichment_research_status: null,
  }));
}

function buildMarkets(filings: Filing[]) {
  const counts = new Map<string, { projects: number; units: number }>();
  for (const filing of filings) {
    const current = counts.get(filing.market) ?? { projects: 0, units: 0 };
    current.projects += 1;
    current.units += filing.units ?? 0;
    counts.set(filing.market, current);
  }

  const known = (source.markets as AtlasMarket[]).map((market) => {
    const current = counts.get(market.name) ?? { projects: 0, units: 0 };
    counts.delete(market.name);
    return {
      ...market,
      project_count: current.projects,
      inventory_units: current.units,
    };
  });

  const additional = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({
      name,
      center_lat: null,
      center_lon: null,
      project_count: count.projects,
      inventory_units: count.units,
    }));
  return [...known, ...additional];
}

async function readDatabaseProjects() {
  const sql = getSql();
  return (await sql`
    SELECT
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
      inventory
    FROM atlas_projects
    ORDER BY id
  `) as AtlasProjectRow[];
}

export const getAtlasDataset = cache(async (): Promise<AtlasDataset> => {
  if (!hasDatabase()) {
    const filings = snapshotProjects().map(toFiling);
    return { filings, markets: buildMarkets(filings), source: 'snapshot' };
  }

  const rows = await readDatabaseProjects();
  if (!rows.length) throw new Error('The Atlas database table is empty.');
  const filings = rows.map(atlasRowToProject).map(toFiling);
  return { filings, markets: buildMarkets(filings), source: 'database' };
});

export const getAtlasProjectRead = cache(async (slug: string) => {
  const id = Number(slug.split('-')[0]);
  if (!Number.isInteger(id)) return null;
  const { filings } = await getAtlasDataset();
  const project = filings.find((item) => item.id === id);
  if (!project) return null;
  return {
    project,
    portfolio: builderPortfolio(filings, project.named_developer),
    nearby: nearbyFilings(filings, project),
  };
});
