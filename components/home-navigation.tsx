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
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#home" className="flex items-center gap-3" aria-label="TrueSquare home">
            <Mark compact />
            <span className="font-heading text-[25px] leading-none tracking-[-0.02em]">TrueSquare</span>
          </a>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
            {navigation.slice(1).map((item) => (
              <a key={item.href} href={item.href} className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
            <a href="#paths" className="rounded-full bg-foreground px-5 py-3 font-mono text-[11px] font-medium tracking-[0.12em] text-background transition-transform hover:-translate-y-0.5">
              GET STARTED
            </a>
          </nav>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="outline" size="icon-lg" className="rounded-full bg-card md:hidden" aria-label="Open navigation" />}>
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
                    className="flex min-h-14 items-center justify-between rounded-2xl px-4 text-[15px] font-medium hover:bg-secondary"
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                  </a>
                ))}
              </nav>
              <div className="mt-auto p-5">
                <a onClick={() => setMenuOpen(false)} href="#paths" className="flex h-14 items-center justify-center gap-3 rounded-full bg-foreground font-mono text-[11px] tracking-[0.13em] text-background">
                  CHOOSE A PATH <ArrowRight className="size-4" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-20 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-[630px] text-center lg:mx-0 lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#157F4F]" />
            BENGALURU · REGISTERED TRANSACTIONS
          </div>
          <h1 className="text-balance font-heading text-[47px] leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-[76px]">
            Before you believe a flat price, check it.
          </h1>
          <p className="mx-auto mt-6 max-w-[540px] text-[16px] leading-[1.6] text-muted-foreground sm:text-lg lg:mx-0">
            Independent pricing intelligence for gated societies in Bengaluru. Built from registered transactions today, with private owner-paid contributions designed to sharpen the ranges as they come in. No brokers, no developer ads, no paid rankings.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/owner" className="flex min-h-[60px] items-center justify-center gap-3 rounded-full bg-foreground px-7 text-center font-mono text-[10px] font-medium tracking-[0.1em] text-background shadow-[0_12px_30px_rgba(11,12,42,.14)] transition-transform hover:-translate-y-0.5">
              I OWN A PROPERTY · FIND WHAT IT&apos;S WORTH TODAY <ArrowRight className="size-4 shrink-0" />
            </Link>
            <Link href="/buyer" className="flex min-h-[60px] items-center justify-center rounded-full border border-border bg-card px-7 text-center font-mono text-[10px] font-medium tracking-[0.1em]">
              I&apos;M BUYING · SEE WHAT SOCIETIES ACTUALLY SELL FOR
            </Link>
          </div>
          <p className="mt-5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">NO LISTINGS SOLD · NO LEADS SOLD · NO DATA SOLD</p>
        </div>

        <div className="mx-auto w-full max-w-[480px] rounded-[34px] border border-border bg-card p-5 shadow-[0_22px_70px_rgba(11,12,42,.08)] sm:p-7">
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
              <div key={title} className="flex items-center gap-4 rounded-[20px] bg-secondary px-4 py-4">
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

      <section id="paths" className="scroll-mt-24 border-y border-border bg-[#EFEDE7]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
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
                  className={`min-h-[154px] rounded-[24px] border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-foreground bg-background shadow-[0_12px_36px_rgba(11,12,42,.07)]' : 'border-border bg-card hover:border-[#AAA79F]'}`}
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
            <Link href={selectedHref} className="flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-full bg-foreground px-6 text-center font-mono text-[11px] tracking-[0.13em] text-background shadow-[0_12px_30px_rgba(11,12,42,.14)] transition-transform hover:-translate-y-0.5">
              {selectedPath === 'owner' ? 'TRACK MY PROPERTY' : selectedPath === 'buyer' ? 'RESEARCH A SOCIETY' : 'EXPLORE THE MARKET'} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="coverage" className="scroll-mt-24 mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">LAUNCH COVERAGE</p>
            <h2 className="mt-4 font-heading text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-5xl">Focused before broad</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">The first release stays within the four Bengaluru markets supported by the current property database.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'].map((area, index) => (
              <div key={area} className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
                <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                <p className="mt-8 font-heading text-[23px] leading-tight">{area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="evidence" className="scroll-mt-24 bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
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
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
