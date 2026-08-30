import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { ExplorerPage } from '@/components/explorer-page';
import { countPublicOwnerContributions, getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getRegisteredTransactions } from '@/lib/registered-transactions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bengaluru market explorer — TrueSquare',
  description: 'Explore registered apartment transaction evidence across TrueSquare’s four supported Bengaluru markets.',
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export default async function ExplorePage() {
  const [ownerAggregates, records] = await Promise.all([
    getPublicOwnerAggregates(),
    getRegisteredTransactions(),
  ]);
  const validPricePerSqFt = records
    .filter((record) => record.registrationDate && record.price && record.effectiveArea && record.effectiveArea > 0 && record.pricePerSqFt && record.pricePerSqFt > 0)
    .map((record) => record.pricePerSqFt as number);

  return (
    <ExplorerPage
      societyCount={propertyData.societies.length}
      transactionCount={records.length}
      ownerContributionCount={countPublicOwnerContributions(ownerAggregates)}
      medianPricePerSqFt={median(validPricePerSqFt)}
    />
  );
}
