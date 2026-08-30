import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';
import { getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getRegisteredTransactions } from '@/lib/registered-transactions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Research a society — TrueSquare',
  description: 'See what supported Bengaluru societies have actually sold for using registered transaction evidence.',
};

export default async function BuyerPage() {
  const [ownerAggregates, records] = await Promise.all([
    getPublicOwnerAggregates(),
    getRegisteredTransactions(),
  ]);
  return <PropertyIntelligenceApp societies={propertyData.societies} records={records} ownerAggregates={ownerAggregates} initialView="buyer" />;
}
