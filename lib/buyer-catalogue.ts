import 'server-only';

import { getSql, hasDatabase } from '@/db';
import {
  buildBuyerSocietyCatalogue,
  type BuyerSocietyEvidenceRow,
  type BuyerSocietySummary,
} from '@/lib/buyer-catalogue-model';
import type { SocietySummary } from '@/lib/society-evidence';

export async function getBuyerSocietyCatalogue(
  fallbackSocieties: SocietySummary[],
): Promise<BuyerSocietySummary[]> {
  if (!hasDatabase()) return fallbackSocieties;

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT
        catalogue_id,
        flat_inventory_id,
        society,
        location,
        builder,
        catalogue_source,
        bhk,
        is_all_bhks,
        registered_count,
        approved_owner_count,
        public_owner_count,
        registered_median_price,
        registered_median_price_per_sq_ft,
        owner_median_price,
        owner_min_price,
        owner_max_price,
        owner_median_price_per_sq_ft,
        owner_min_price_per_sq_ft,
        owner_max_price_per_sq_ft,
        latest_registered_date,
        latest_owner_date,
        evidence_source
      FROM buyer_society_evidence
      ORDER BY society, location, is_all_bhks DESC, bhk
    `) as BuyerSocietyEvidenceRow[];

    if (!rows.length) return fallbackSocieties;
    return buildBuyerSocietyCatalogue(rows, fallbackSocieties);
  } catch (error) {
    console.error('Unable to load the Buyer society catalogue.', error);
    return fallbackSocieties;
  }
}
