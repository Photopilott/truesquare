import type { Metadata } from 'next';

import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';

export const metadata: Metadata = {
  title: 'Research a society — TrueSquare',
  description: 'See what supported Bengaluru societies have actually sold for using registered transaction evidence.',
};

export default function BuyerPage() {
  return <PropertyIntelligenceApp societies={propertyData.societies} records={propertyData.records} initialView="buyer" />;
}
