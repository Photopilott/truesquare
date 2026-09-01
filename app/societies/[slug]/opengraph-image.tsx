import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

import { getPublicSocietyEvidence } from '@/lib/society-evidence-data';
import { compactInr, wholeInr } from '@/lib/society-evidence';

export const alt = 'FlatData registered society price benchmark';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const evidence = await getPublicSocietyEvidence(slug);
  if (!evidence) notFound();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#f7f1e8',
        color: '#221b13',
        padding: '64px 72px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>FlatData</div>
        <div style={{ fontSize: 20, color: '#5e554c' }}>
          {evidence.society.location}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 22, color: '#5e554c', letterSpacing: 2 }}>
          REGISTERED SOCIETY BENCHMARK
        </div>
        <div style={{ marginTop: 18, fontSize: 64, fontWeight: 700 }}>
          {evidence.society.name}
        </div>
        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 28,
          }}
        >
          <div style={{ fontSize: 76, fontWeight: 700 }}>
            {compactInr(evidence.registeredMedianPrice)}
          </div>
          <div style={{ paddingBottom: 12, fontSize: 28, color: '#5e554c' }}>
            {wholeInr(evidence.registeredMedianPricePerSqFt)} / sq ft
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 23,
        }}
      >
        <div>
          {evidence.registeredCount} supporting sales · {evidence.confidence}{' '}
          confidence
        </div>
        <div style={{ color: '#27633a', fontWeight: 700 }}>
          Personal flat prices stay private
        </div>
      </div>
    </div>,
    size,
  );
}
