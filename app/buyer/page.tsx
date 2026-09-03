import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';
import { getBuyerSocietyCatalogue } from '@/lib/buyer-catalogue';
import { getPublicOwnerAggregates } from '@/lib/owner-aggregates';
import { getRegisteredTransactions } from '@/lib/registered-transactions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Bengaluru societies — FlatData',
  description:
    'Search Bengaluru societies and compare registered transactions with admin-approved owner evidence.',
};

export default async function BuyerPage() {
  const [societies, ownerAggregates, records] = await Promise.all([
    getBuyerSocietyCatalogue(propertyData.societies),
    getPublicOwnerAggregates(),
    getRegisteredTransactions(),
  ]);
  return (
    <PropertyIntelligenceApp
      societies={societies}
      records={records}
      ownerAggregates={ownerAggregates}
      initialView="buyer"
    />
  );
}
