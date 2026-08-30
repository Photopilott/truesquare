'use client';

import { useState } from 'react';
import { ArrowRight, Check, Menu, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const navigation = [
  { label: 'Home', href: '#home' },
  { label: 'Choose a path', href: '#paths' },
  { label: 'Coverage', href: '#coverage' },
  { label: 'How it works', href: '#evidence' },
  { label: 'Explorer', href: '/explore' },
  { label: 'Developer ratings', href: '/developer-ratings.html' },
];

const paths = [
  {
    id: 'owner',
    title: 'I own a property',
    description: "Find what it's worth today.",
  },
  {
    id: 'buyer',
    title: "I'm buying",
    description: 'See what societies actually sell for.',
  },
  {
    id: 'browse',
    title: 'Just exploring',
    description: 'Explore the market freely without an account.',
  },
] as const;

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center bg-foreground ${compact ? 'size-8 rounded-[11px]' : 'size-10 rounded-[14px]'}`} aria-hidden="true">
      <span className={`rounded-full bg-background ${compact ? 'size-3' : 'size-4'}`} />
    </span>
  );
}

export function HomeNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<(typeof paths)[number]['id']>('owner');
  const selectedHref = selectedPath === 'owner' ? '/owner' : selectedPath === 'buyer' ? '/buyer' : '/explore';

  return (
    <main id="home" className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-3 z-40 px-4">
        <div className="ts-shell flex min-h-[74px] items-center justify-between gap-6 rounded-[14px] border border-foreground/10 bg-card/95 px-4 shadow-[0_10px_26px_rgba(38,29,18,.10)] backdrop-blur-xl sm:px-6">
          <a href="#home" className="flex items-center gap-3" aria-label="TrueSquare home">
            <Mark compact />
            <span className="font-heading text-[31px] font-medium leading-none tracking-[-0.03em]">TrueSquare</span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Main navigation">
            {navigation.slice(1).map((item) => (
              <a key={item.href} href={item.href} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
            <a href="#paths" className="rounded-[9px] border border-foreground bg-foreground px-5 py-3 text-[13px] font-semibold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(21,17,13,.12)]">
              GET STARTED
            </a>
          </nav>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-lg" className="bg-card lg:hidden" aria-label="Open navigation" />}>
              <Menu className="size-[18px]" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[86%] border-border bg-background p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-border px-6 py-6 text-left">
                <div className="flex items-center gap-3">
                  <Mark compact />
                  <SheetTitle className="font-heading text-2xl font-normal">TrueSquare</SheetTitle>
                </div>
                <SheetDescription className="pt-3 leading-relaxed">Independent Bengaluru property intelligence.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col px-4 py-4" aria-label="Mobile navigation">
                {navigation.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-[8px] px-4 text-[15px] font-medium hover:bg-secondary"
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                  </a>
                ))}
              </nav>
              <div className="mt-auto p-5">
                <a onClick={() => setMenuOpen(false)} href="#paths" className="flex h-14 items-center justify-center gap-3 rounded-[9px] bg-foreground text-[13px] font-semibold text-background">
                  CHOOSE A PATH <ArrowRight className="size-4" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="ts-shell grid min-h-[700px] gap-12 pb-20 pt-24 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-28">
        <div className="mx-auto max-w-[630px] text-center lg:mx-0 lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 border border-border bg-card px-3 py-2 font-mono text-[9px] text-muted-foreground">
            <span className="size-2 bg-[#8BE6A9]" />
            BENGALURU · REGISTERED TRANSACTIONS
          </div>
          <h1 className="text-balance font-heading text-[54px] font-normal leading-[.94] tracking-[-0.035em] sm:text-7xl lg:text-[86px]">
            Before you believe a flat price, check it.
          </h1>
          <p className="mx-auto mt-6 max-w-[540px] text-[16px] leading-[1.6] text-muted-foreground sm:text-lg lg:mx-0">
            Independent pricing intelligence for gated societies in Bengaluru. Built from registered transactions today, with private owner-paid contributions designed to sharpen the ranges as they come in. No brokers, no developer ads, no paid rankings.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/owner" className="flex min-h-[52px] items-center justify-center gap-3 rounded-[9px] border border-foreground bg-foreground px-6 text-center text-[13px] font-semibold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(21,17,13,.12)]">
              I OWN A PROPERTY · FIND WHAT IT&apos;S WORTH TODAY <ArrowRight className="size-4 shrink-0" />
            </Link>
            <Link href="/buyer" className="flex min-h-[52px] items-center justify-center rounded-[9px] border border-foreground bg-transparent px-6 text-center text-[13px] font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(21,17,13,.12)]">
              I&apos;M BUYING · SEE WHAT SOCIETIES ACTUALLY SELL FOR
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">NO LISTINGS SOLD · NO LEADS SOLD · NO DATA SOLD</p>
        </div>

        <div className="mx-auto w-full max-w-[480px] rounded-[16px] border border-border bg-card p-5 shadow-[0_18px_50px_rgba(34,27,19,.10)] sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.13em] text-muted-foreground">SOCIETY EVIDENCE</p>
              <h2 className="mt-2 font-heading text-[29px] leading-none">A clearer starting point</h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#157F4F]">Source-led evidence</span>
          </div>
          <div className="mt-7 space-y-3">
            {[
              ['Registered sales', 'Like-for-like evidence'],
              ['Valuation range', 'Never presented as certainty'],
              ['Confidence level', 'Based on transaction count'],
            ].map(([title, copy]) => (
              <div key={title} className="flex items-center gap-4 border border-border bg-secondary px-4 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card"><Check className="size-4" /></span>
                <div><p className="text-[14px] font-semibold">{title}</p><p className="mt-0.5 text-[12px] text-muted-foreground">{copy}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-5 text-[12px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-[#157F4F]" />
            Unit numbers stay hidden. Estimates remain clearly labelled.
          </div>
        </div>
      </section>

      <section id="paths" className="scroll-mt-24 border-y border-border bg-secondary">
        <div className="ts-shell py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">CHOOSE YOUR PATH</p>
            <h2 className="mt-4 text-balance font-heading text-[40px] leading-[1.02] tracking-[-0.025em] sm:text-6xl">Where would you like to start?</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">Look around freely. You&apos;ll only need to sign in when you want your numbers.</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-3 md:grid-cols-3">
            {paths.map((path, index) => {
              const selected = selectedPath === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedPath(path.id)}
                  className={`min-h-[168px] rounded-[12px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-foreground bg-card shadow-[0_12px_36px_rgba(34,27,19,.08)]' : 'border-border bg-card hover:-translate-y-1 hover:border-foreground'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">0{index + 1}</span>
                    <span className={`grid size-6 place-items-center rounded-full border ${selected ? 'border-foreground bg-foreground text-background' : 'border-border'}`}>
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold">{path.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{path.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-6 flex max-w-4xl justify-center">
            <Link href={selectedHref} className="flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-[9px] border border-foreground bg-foreground px-6 text-center text-[13px] font-semibold text-background transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(21,17,13,.12)]">
              {selectedPath === 'owner' ? 'TRACK MY PROPERTY' : selectedPath === 'buyer' ? 'RESEARCH A SOCIETY' : 'EXPLORE THE MARKET'} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="coverage" className="ts-shell scroll-mt-24 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">LAUNCH COVERAGE</p>
            <h2 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-5xl">Focused before broad</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">The first release stays within the four Bengaluru markets supported by the current property database.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'].map((area, index) => (
              <div key={area} className="min-h-[180px] rounded-[12px] border border-border bg-card p-5 transition-transform hover:-translate-y-1 sm:p-6">
                <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                <p className="mt-8 font-heading text-[23px] leading-tight">{area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="evidence" className="scroll-mt-24 bg-foreground text-background">
        <div className="ts-shell grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-background/55">OUR PROMISE</p>
            <h2 className="mt-4 max-w-2xl text-balance font-heading text-[42px] leading-[1.02] tracking-[-0.025em] sm:text-6xl">Evidence when it exists. Honesty when it doesn’t.</h2>
          </div>
          <div className="space-y-5 border-l border-background/15 pl-6 text-[14px] leading-relaxed text-background/70 sm:pl-8">
            <p>Owners privately share what they paid. TrueSquare is designed to pool those contributions anonymously with registered transactions. Everyone gets a price they can check.</p>
            <p>The current release uses the supplied registered-transaction workbook. Owner pooling begins only when secure production storage is connected.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="ts-shell flex flex-col gap-7 py-10 sm:flex-row sm:items-center sm:justify-between">
          <a href="#home" className="flex items-center gap-3"><Mark compact /><span className="font-heading text-2xl">TrueSquare</span></a>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
            {navigation.map((item) => <a key={item.href} href={item.href} className="text-[12px] text-muted-foreground hover:text-foreground">{item.label}</a>)}
          </nav>
          <div className="max-w-md text-[11px] leading-relaxed text-muted-foreground"><p>We don&apos;t take money from brokers or developers. There is nobody for us to please except you.</p><p className="mt-1">Property intelligence, not financial advice.</p></div>
        </div>
      </footer>
    </main>
  );
}
