import 'server-only';

import { cache } from 'react';

import propertyData from '@/data/property-data.json';
import { getBuyerSocietyCatalogue } from '@/lib/buyer-catalogue';
import { societyNameKey } from '@/lib/buyer-catalogue-model';
import { getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getRegisteredTransactions } from '@/lib/registered-transactions';
import {
  buildPublicSocietyEvidence,
  type PublicSocietyEvidence,
  type SocietySummary,
} from '@/lib/society-evidence';

const societies = propertyData.societies as SocietySummary[];

export async function getSocietySummary(slug: string) {
  const catalogue = await getBuyerSocietyCatalogue(societies);
  const catalogueMatch = catalogue.find((society) => society.slug === slug);
  if (catalogueMatch) return catalogueMatch;
  const permanent = societies.find((society) => society.slug === slug);
  if (!permanent) return null;
  return (
    catalogue.find(
      (society) =>
        societyNameKey(society.name) === societyNameKey(permanent.name),
    ) ?? permanent
  );
}

export async function getSocietySummaryByName(name: string) {
  const nameKey = societyNameKey(name);
  const permanent = societies.find(
    (society) => societyNameKey(society.name) === nameKey,
  );
  if (permanent) return permanent;
  const catalogue = await getBuyerSocietyCatalogue(societies);
  return (
    catalogue.find((society) => societyNameKey(society.name) === nameKey) ??
    null
  );
}

export function getAllSocietySummaries() {
  return societies;
}

export const getPublicSocietyEvidence = cache(
  async (slug: string): Promise<PublicSocietyEvidence | null> => {
    const society = await getSocietySummary(slug);
    if (!society) return null;
    const [records, ownerAggregates] = await Promise.all([
      getRegisteredTransactions(),
      getPublicOwnerAggregates(),
    ]);
    return buildPublicSocietyEvidence(society, records, ownerAggregates);
  },
);
