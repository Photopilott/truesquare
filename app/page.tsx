import propertyData from '@/data/property-data.json';
import { PropertyIntelligenceApp } from '@/components/property-intelligence-app';

export default function Home() {
  return <PropertyIntelligenceApp societies={propertyData.societies} records={propertyData.records} />;
}
