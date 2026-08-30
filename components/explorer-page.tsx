import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

import { AppHeader } from '@/components/property-intelligence-app';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ExplorerPageProps = {
  societyCount: number;
  transactionCount: number;
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

export function ExplorerPage({ societyCount, transactionCount, medianPricePerSqFt }: ExplorerPageProps) {
  const rules = [
    'No brokers on this platform.',
    'No developer advertising.',
    'No paid rankings or sponsored placement.',
    'No individual purchase price is ever shown. No unit numbers are ever collected.',
    'No data sales, ad trackers, or targeting.',
    'Every estimate carries its confidence level and the evidence behind it.',
  ];

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground sm:pb-0">
      <AppHeader active="explore" />

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
        <div className="max-w-4xl">
          <Badge variant="outline" className="rounded-full px-4 py-2 font-mono text-[10px] tracking-[0.1em]">OPEN MARKET EXPLORER</Badge>
          <h1 className="mt-6 text-balance font-heading text-[48px] font-normal leading-[.98] tracking-[-0.035em] sm:text-7xl">What apartments in your corridor are actually worth.</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">An open, evidence-based view of gated societies in Sarjapur Road, Bellandur, Marathahalli, and Haralur—priced from registered transactions today, with anonymous owner contributions planned once secure storage is connected. Look around. No account needed.</p>
          <Link href="/buyer" className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-foreground px-7 font-mono text-[11px] tracking-[0.12em] text-background">EXPLORE THE MARKET <ArrowRight className="size-4" /></Link>
          <p className="mt-3 text-xs text-muted-foreground">No sign-up, no questionnaire, nothing to fill in.</p>
        </div>
      </section>

      <section className="border-y border-border bg-[#EFEDE7]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">SOCIETIES COVERED</p><CardTitle className="mt-3 text-4xl">{societyCount}</CardTitle></CardHeader></Card>
            <Card><CardHeader><p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">RECORDS ANALYSED</p><CardTitle className="mt-3 text-4xl">{transactionCount}</CardTitle></CardHeader></Card>
            <Card><CardHeader><p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">OWNER PRICES POOLED</p><CardTitle className="mt-3 text-4xl">0</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Secure production pooling is not connected yet.</CardContent></Card>
            <Card><CardHeader><p className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">CORRIDOR MEDIAN / SQ FT</p><CardTitle className="mt-3 text-4xl">{formatInr(medianPricePerSqFt)}</CardTitle></CardHeader></Card>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Updated as approved transactions and contributions come in.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.75fr_1.25fr]">
        <div><p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">WHY THIS EXISTS</p><h2 className="mt-4 font-heading text-4xl font-normal sm:text-5xl">The missing record for Bengaluru apartments.</h2></div>
        <div className="space-y-5 text-[15px] leading-7 text-muted-foreground">
          <p>Real-estate information in Bengaluru is fragmented, delayed, anecdotal, and usually held by someone who earns from the transaction.</p>
          <p>Owners know a ballpark. Buyers know an asking price. Neither can easily check either.</p>
          <p>So we are building the missing record: registered transactions plus purchase prices contributed privately by owners, pooled anonymously and published only as safe ranges.</p>
          <p className="font-medium text-foreground">The more owners contribute, the sharper it gets—for everyone. Until production pooling is connected, this prototype relies on the supplied transaction workbook.</p>
        </div>
      </section>

      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-[10px] tracking-[0.14em] text-background/55">BROWSE</p>
          <h2 className="mt-4 font-heading text-4xl font-normal sm:text-6xl">Start anywhere</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By micro-market</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">{markets.join(' · ')}</CardContent></Card>
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By society name</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">Search all supported gated societies.</CardContent></Card>
            <Card className="bg-background text-foreground"><CardHeader><CardTitle>By budget band</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-muted-foreground">Use the V1 budget and BHK filters.</CardContent></Card>
          </div>
          <p className="mt-7 max-w-3xl text-sm leading-7 text-background/65">Society-level registered pricing and confidence are visible as you browse. You will only be asked to sign in when opening the full evidence for a specific society.</p>
          <Link href="/buyer" className="mt-7 inline-flex min-h-14 items-center justify-center rounded-full bg-background px-7 font-mono text-[11px] tracking-[0.1em] text-foreground">BROWSE SOCIETIES</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div><ShieldCheck className="size-8 text-accent-foreground" /><h2 className="mt-5 font-heading text-4xl font-normal sm:text-5xl">Our rules, published</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">{rules.map((rule) => <div key={rule} className="flex gap-3 rounded-[20px] border border-border bg-card p-4 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-accent-foreground" /><span>{rule}</span></div>)}</div>
        </div>
        <p className="mt-8 border-l-2 border-foreground pl-5 font-heading text-2xl">We&apos;d rather show a wide range than a confident wrong number.</p>
      </section>
    </main>
  );
}
