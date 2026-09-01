import { MarketRegister } from '@/components/atlas/market-register';
import { getAtlasDataset } from '@/lib/atlas-data';

export const dynamic = 'force-dynamic';

export default async function AtlasPage() {
  const { filings, markets } = await getAtlasDataset();
  return <MarketRegister filings={filings} markets={markets} />;
}
