import 'server-only';

import { getSql, hasDatabase } from '@/db';

export type OwnerSocietyOption = {
  id: string;
  flatInventoryId: string | null;
  name: string;
  location: string;
  builder: string | null;
  hasValuation: boolean;
  source: 'inventory' | 'final_value';
};

type OwnerSocietyRow = {
  flat_inventory_id: string | null;
  name: string;
  location: string;
  builder: string | null;
  has_valuation: boolean;
  source: 'inventory' | 'final_value';
};

type FallbackSociety = {
  slug: string;
  name: string;
  location: string;
  transactionCount: number;
};

function finalValueId(name: string, location: string) {
  return `final:${encodeURIComponent(name.trim().toLowerCase())}:${encodeURIComponent(location.trim().toLowerCase())}`;
}

function fallbackOptions(societies: FallbackSociety[]): OwnerSocietyOption[] {
  return societies.map((society) => ({
    id: `fallback:${society.slug}`,
    flatInventoryId: null,
    name: society.name,
    location: society.location,
    builder: null,
    hasValuation: society.transactionCount > 0,
    source: 'final_value',
  }));
}

export async function getOwnerSocietyOptions(
  societies: FallbackSociety[],
): Promise<OwnerSocietyOption[]> {
  if (!hasDatabase()) return fallbackOptions(societies);

  try {
    const sql = getSql();
    const rows = (await sql`
      WITH inventory_options AS (
        SELECT
          inventory.id AS flat_inventory_id,
          inventory.name,
          inventory.area AS location,
          NULLIF(BTRIM(inventory.builder), '') AS builder,
          EXISTS (
            SELECT 1
            FROM final_flat_values final_values
            WHERE
              final_values.flat_inventory_id = inventory.id
              OR (
                LOWER(BTRIM(final_values.society)) = LOWER(BTRIM(inventory.name))
                AND LOWER(BTRIM(final_values.location)) = LOWER(BTRIM(inventory.area))
              )
          ) AS has_valuation,
          'inventory'::text AS source
        FROM bangalore_flat_inventory inventory
        WHERE inventory.active = TRUE
      ), final_only_options AS (
        SELECT DISTINCT ON (
          LOWER(BTRIM(final_values.society)),
          LOWER(BTRIM(final_values.location))
        )
          NULL::text AS flat_inventory_id,
          BTRIM(final_values.society) AS name,
          BTRIM(final_values.location) AS location,
          NULL::text AS builder,
          TRUE AS has_valuation,
          'final_value'::text AS source
        FROM final_flat_values final_values
        WHERE NOT EXISTS (
          SELECT 1
          FROM bangalore_flat_inventory inventory
          WHERE inventory.active = TRUE
            AND LOWER(BTRIM(inventory.name)) = LOWER(BTRIM(final_values.society))
            AND LOWER(BTRIM(inventory.area)) = LOWER(BTRIM(final_values.location))
        )
        ORDER BY
          LOWER(BTRIM(final_values.society)),
          LOWER(BTRIM(final_values.location)),
          final_values.value_date DESC NULLS LAST,
          final_values.created_at DESC
      )
      SELECT * FROM inventory_options
      UNION ALL
      SELECT * FROM final_only_options
      ORDER BY name, location
    `) as OwnerSocietyRow[];

    if (!rows.length) return fallbackOptions(societies);
    return rows.map((row) => ({
      id: row.flat_inventory_id
        ? `inventory:${row.flat_inventory_id}`
        : finalValueId(row.name, row.location),
      flatInventoryId: row.flat_inventory_id,
      name: row.name,
      location: row.location,
      builder: row.builder,
      hasValuation: Boolean(row.has_valuation),
      source: row.source,
    }));
  } catch (error) {
    console.error('Unable to load the owner society search.', error);
    return fallbackOptions(societies);
  }
}
