import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';

export const metadata: Metadata = {
  title: 'Owner valuation — TrueSquare',
  description: 'Estimate your apartment value using like-for-like registered transactions and a visible confidence level.',
};

export default function OwnerPage() {
  return <PropertyIntelligenceApp societies={propertyData.societies} records={propertyData.records} initialView="owner" />;
}
