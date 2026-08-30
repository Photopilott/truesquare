import { getSql, hasDatabase } from '@/db';

export const MINIMUM_PUBLIC_CONTRIBUTIONS = 3;

export type OwnerPriceAggregate = {
  society: string;
  location: string;
  bhk: string;
  approvedCount: number;
  minPricePerSqFt: number;
  medianPricePerSqFt: number;
  maxPricePerSqFt: number;
  updatedAt: string;
};

type AggregateRow = {
  society: string;
  location: string;
  bhk: string;
  approved_count: number;
  min_price_per_sq_ft: string;
  median_price_per_sq_ft: string;
  max_price_per_sq_ft: string;
  updated_at: string | Date;
};

export async function getPublicOwnerAggregates(): Promise<OwnerPriceAggregate[]> {
  if (!hasDatabase()) return [];

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT
        society,
        location,
        bhk,
        approved_count,
        min_price_per_sq_ft,
        median_price_per_sq_ft,
        max_price_per_sq_ft,
        updated_at
      FROM owner_price_aggregates
      WHERE approved_count >= ${MINIMUM_PUBLIC_CONTRIBUTIONS}
      ORDER BY society, bhk
    ` as AggregateRow[];

    return rows.map((row) => ({
      society: row.society,
      location: row.location,
      bhk: row.bhk,
      approvedCount: Number(row.approved_count),
      minPricePerSqFt: Number(row.min_price_per_sq_ft),
      medianPricePerSqFt: Number(row.median_price_per_sq_ft),
      maxPricePerSqFt: Number(row.max_price_per_sq_ft),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  } catch (error) {
    console.error('Unable to load public owner aggregates.', error);
    return [];
  }
}

export function countPublicOwnerContributions(aggregates: OwnerPriceAggregate[]) {
  return aggregates.reduce((sum, aggregate) => sum + aggregate.approvedCount, 0);
}
