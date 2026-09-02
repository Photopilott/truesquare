import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';
import { getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getOwnerSocietyOptions } from '@/lib/owner-society-search';
import { getRegisteredTransactions } from '@/lib/registered-transactions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Track your apartment — FlatData',
  description:
    'Track an apartment’s estimated value and returns using like-for-like registered transactions and a visible confidence level.',
};

export default async function OwnerPage() {
  const [ownerAggregates, ownerSocieties, records] = await Promise.all([
    getPublicOwnerAggregates(),
    getOwnerSocietyOptions(propertyData.societies),
    getRegisteredTransactions(),
  ]);
  return (
    <PropertyIntelligenceApp
      societies={propertyData.societies}
      ownerSocieties={ownerSocieties}
      records={records}
      ownerAggregates={ownerAggregates}
      initialView="owner"
    />
  );
}
