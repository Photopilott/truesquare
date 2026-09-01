import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

import { AppHeader } from '@/components/property-intelligence-app';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ExplorerPageProps = {
  societyCount: number;
  transactionCount: number;
  ownerContributionCount: number;
  medianPricePerSqFt: number | null;
};

const markets = ['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'];

function formatInr(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ExplorerPage({ societyCount, transactionCount, ownerContributionCount, medianPricePerSqFt }: ExplorerPageProps) {
  const rules = [
    'No brokers on this platform.',
    'No developer advertising.',
    'No paid rankings or sponsored placement.',
    'No individual purchase price is ever shown. No unit numbers are ever collected.',
    'No data sales, ad trackers, or targeting.',
    'Every estimate carries its confidence level and the evidence behind it.',
  ];

  return (
    <main className="ts-orb min-h-screen">
      <AppHeader />

      <section className="ts-orb-shell ts-orb-hero">
        <div>
          <p className="ts-orb-eyebrow">OPEN MARKET EXPLORER</p>
          <h1 className="ts-orb-hero-title">What apartments in your corridor are actually worth.</h1>
          <p className="ts-orb-hero-copy">An open, evidence-based view of gated societies in Sarjapur Road, Bellandur, Marathahalli, and Haralur—priced from registered transactions and approved anonymous owner contributions. Look around. No account needed.</p>
          <div className="ts-orb-hero-actions"><Link href="/buyer" className="ts-orb-button ts-orb-button-dark">EXPLORE THE MARKET <ArrowRight className="size-4" /></Link></div>
          <p className="ts-orb-note">No sign-up, no questionnaire, nothing to fill in.</p>
        </div>
        <div className="ts-orb-trust-card">
          <span className="ts-orb-ribbon">LIVE MARKET</span>
          <div className="ts-orb-trust-top">
            <p className="font-mono text-[9px] text-muted-foreground">BENGALURU LAUNCH CORRIDOR</p>
            <h2 className="mt-2 font-heading text-[35px] font-medium leading-none">Market evidence</h2>
          </div>
          <div className="ts-orb-trust-body">
            <p className="text-sm text-muted-foreground">Owner prices pooled: <strong className="text-foreground">{ownerContributionCount}</strong></p>
            <p className="text-xs text-muted-foreground">Only admin-approved contributions that meet the privacy threshold are counted. Updated as approved evidence comes in.</p>
          </div>
          <div className="ts-orb-evidence-strip">
            <div><strong>{societyCount}</strong><span>Societies</span></div>
            <div><strong>{transactionCount}</strong><span>Records</span></div>
            <div><strong>{formatInr(medianPricePerSqFt)}</strong><span>Median / sq ft</span></div>
          </div>
        </div>
      </section>

      <section className="ts-orb-section">
        <div className="ts-orb-shell ts-orb-section-head">
        <div><p className="ts-orb-eyebrow">WHY THIS EXISTS</p><h2 className="ts-orb-section-title">The missing record for Bengaluru apartments.</h2></div>
        <div className="space-y-5 text-[15px] leading-7 text-muted-foreground">
          <p>Real-estate information in Bengaluru is fragmented, delayed, anecdotal, and usually held by someone who earns from the transaction.</p>
          <p>Owners know a ballpark. Buyers know an asking price. Neither can easily check either.</p>
          <p>So we are building the missing record: registered transactions plus purchase prices contributed privately by owners, pooled anonymously and published only as safe ranges.</p>
          <p className="font-medium text-foreground">The more owners contribute, the sharper it gets—for everyone. Raw submissions stay private; only qualifying anonymous ranges are published.</p>
        </div>
        </div>
      </section>

      <section className="ts-orb-blue">
        <div className="ts-orb-shell text-center">
          <p className="ts-orb-eyebrow">BROWSE</p>
          <h2>Start anywhere</h2>
          <div className="ts-orb-grid mt-8 text-left">
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By micro-market</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">{markets.join(' · ')}</CardContent></Card>
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By society name</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">Search all supported gated societies.</CardContent></Card>
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By budget band</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">Use the V1 budget and BHK filters.</CardContent></Card>
          </div>
          <p className="mx-auto mt-7 max-w-3xl text-sm leading-7 text-[#DCE3FF]">Society-level registered pricing and confidence are visible as you browse. You will only be asked to sign in when opening the full evidence for a specific society.</p>
          <Link href="/buyer" className="ts-orb-button mt-7 bg-white">BROWSE SOCIETIES</Link>
        </div>
      </section>

      <section className="ts-orb-section ts-orb-mint">
        <div className="ts-orb-shell">
          <div className="ts-orb-section-head"><div><ShieldCheck className="size-8 text-accent-foreground" /><h2 className="ts-orb-section-title mt-5">Our rules, published</h2></div><p className="ts-orb-section-copy">We&apos;d rather show a wide range than a confident wrong number.</p></div>
          <div className="ts-orb-grid">{rules.map((rule, index) => <div key={rule} className="ts-orb-choice"><span className="font-mono text-[10px]">0{index + 1}</span><h3>{rule}</h3><CheckCircle2 className="mt-auto size-4 text-accent-foreground" /></div>)}</div>
        </div>
      </section>
    </main>
  );
}
