import 'server-only';

import { cache } from 'react';

import propertyData from '@/data/property-data.json';
import { getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getRegisteredTransactions } from '@/lib/registered-transactions';
import {
  buildPublicSocietyEvidence,
  type PublicSocietyEvidence,
  type SocietySummary,
} from '@/lib/society-evidence';

const societies = propertyData.societies as SocietySummary[];

export function getSocietySummary(slug: string) {
  return societies.find((society) => society.slug === slug) ?? null;
}

export function getSocietySummaryByName(name: string) {
  return societies.find((society) => society.name === name) ?? null;
}

export function getAllSocietySummaries() {
  return societies;
}

export const getPublicSocietyEvidence = cache(
  async (slug: string): Promise<PublicSocietyEvidence | null> => {
    const society = getSocietySummary(slug);
    if (!society) return null;
    const [records, ownerAggregates] = await Promise.all([
      getRegisteredTransactions(),
      getPublicOwnerAggregates(),
    ]);
    return buildPublicSocietyEvidence(society, records, ownerAggregates);
  },
);
