'use client';

import { useState } from 'react';
import { ArrowRight, Check, Menu } from 'lucide-react';
import Link from 'next/link';

import { BrandWordmark } from '@/components/brand-wordmark';
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
  { label: 'Atlas', href: '/atlas' },
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
    <span
      className={`grid shrink-0 place-items-center bg-foreground ${compact ? 'size-8 rounded-[11px]' : 'size-10 rounded-[14px]'}`}
      aria-hidden="true"
    >
      <span
        className={`rounded-full bg-background ${compact ? 'size-3' : 'size-4'}`}
      />
    </span>
  );
}

export function HomeNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPath, setSelectedPath] =
    useState<(typeof paths)[number]['id']>('owner');
  const selectedHref =
    selectedPath === 'owner'
      ? '/owner'
      : selectedPath === 'buyer'
        ? '/buyer'
        : '/explore';

  return (
    <main id="home" className="ts-orb min-h-screen overflow-hidden">
      <div className="ts-orb-announcement">
        <strong>INDEPENDENT</strong>
        <span>No listings sold. No leads sold. No data sold.</span>
      </div>
      <header className="ts-orb-shell ts-orb-nav">
        <div className="contents">
          <a href="#home" className="ts-orb-brand" aria-label="FlatData home">
            <BrandWordmark />
          </a>

          <nav className="ts-orb-nav-links" aria-label="Main navigation">
            {navigation.slice(1).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#paths"
              className="ts-orb-button ts-orb-button-dark ts-orb-button-small"
            >
              GET STARTED
            </a>
          </nav>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-lg"
                  className="lg:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu className="size-[18px]" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[86%] border-border bg-background p-0 sm:max-w-sm"
            >
              <SheetHeader className="border-b border-border px-6 py-6 text-left">
                <div className="flex items-center gap-3">
                  <Mark compact />
                  <SheetTitle className="text-2xl font-normal">
                    <BrandWordmark />
                  </SheetTitle>
                </div>
                <SheetDescription className="pt-3 leading-relaxed">
                  Independent Bengaluru property intelligence.
                </SheetDescription>
              </SheetHeader>
              <nav
                className="flex flex-col px-4 py-4"
                aria-label="Mobile navigation"
              >
                {navigation.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-[8px] px-4 text-[15px] font-medium hover:bg-secondary"
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </a>
                ))}
              </nav>
              <div className="mt-auto p-5">
                <a
                  onClick={() => setMenuOpen(false)}
                  href="#paths"
                  className="flex h-14 items-center justify-center gap-3 rounded-[9px] bg-foreground text-[13px] font-semibold text-background"
                >
                  CHOOSE A PATH <ArrowRight className="size-4" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <section className="ts-orb-shell ts-orb-hero">
        <div>
          <p className="ts-orb-eyebrow">BENGALURU · REGISTERED TRANSACTIONS</p>
          <h1 className="ts-orb-hero-title">
            Before you believe a flat price, check it.
          </h1>
          <p className="ts-orb-hero-copy">
            Independent pricing intelligence for gated societies in Bengaluru.
            Built from registered transactions today, with private owner-paid
            contributions designed to sharpen the ranges as they come in. No
            brokers, no developer ads, no paid rankings.
          </p>
          <div className="ts-orb-hero-actions">
            <Link href="/owner" className="ts-orb-button ts-orb-button-dark">
              I OWN A PROPERTY · FIND WHAT IT&apos;S WORTH TODAY{' '}
              <ArrowRight className="size-4 shrink-0" />
            </Link>
            <Link href="/buyer" className="ts-orb-button">
              I&apos;M BUYING · SEE WHAT SOCIETIES ACTUALLY SELL FOR
            </Link>
          </div>
          <p className="ts-orb-note">
            Look around freely. You&apos;ll only need to sign in when you want
            your numbers.
          </p>
        </div>

        <div className="ts-orb-trust-card">
          <span className="ts-orb-ribbon">SOURCE-LED EVIDENCE</span>
          <div className="ts-orb-trust-top">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.13em] text-muted-foreground">
                  SOCIETY EVIDENCE
                </p>
                <h2 className="mt-2 font-heading text-[35px] font-medium leading-none">
                  A clearer starting point
                </h2>
              </div>
            </div>
          </div>
          <div className="ts-orb-trust-body">
            {[
              ['Registered sales', 'Like-for-like evidence'],
              ['Valuation range', 'Never presented as certainty'],
              ['Confidence level', 'Based on transaction count'],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="flex items-center gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-card">
                  <Check className="size-4" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="ts-orb-evidence-strip">
            <div>
              <strong>Range</strong>
              <span>Not certainty</span>
            </div>
            <div>
              <strong>Count</strong>
              <span>Evidence shown</span>
            </div>
            <div>
              <strong>Private</strong>
              <span>Units hidden</span>
            </div>
          </div>
        </div>
      </section>

      <section id="paths" className="ts-orb-section scroll-mt-24">
        <div className="ts-orb-shell">
          <div className="ts-orb-section-head">
            <div>
              <p className="ts-orb-eyebrow">CHOOSE YOUR PATH</p>
              <h2 className="ts-orb-section-title">
                Where would you like to start?
              </h2>
            </div>
            <p className="ts-orb-section-copy">
              Look around freely. You&apos;ll only need to sign in when you want
              your numbers.
            </p>
          </div>

          <div className="ts-orb-grid">
            {paths.map((path, index) => {
              const selected = selectedPath === path.id;
              return (
                <button
                  key={path.id}
                  type="button"
                  aria-pressed={selected}
                  data-active={selected}
                  onClick={() => setSelectedPath(path.id)}
                  className="ts-orb-choice"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <span
                      className={`grid size-6 place-items-center rounded-full border ${selected ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
                    >
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </div>
                  <h3>{path.title}</h3>
                  <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
                    {path.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-6 flex max-w-4xl justify-center">
            <Link
              href={selectedHref}
              className="ts-orb-button ts-orb-button-dark w-full max-w-md"
            >
              {selectedPath === 'owner'
                ? 'TRACK MY PROPERTY'
                : selectedPath === 'buyer'
                  ? 'RESEARCH A SOCIETY'
                  : 'EXPLORE THE MARKET'}{' '}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="coverage"
        className="ts-orb-section ts-orb-mint scroll-mt-24"
      >
        <div className="ts-orb-shell">
          <div className="ts-orb-section-head">
            <div>
              <p className="ts-orb-eyebrow">LAUNCH COVERAGE</p>
              <h2 className="ts-orb-section-title">Focused before broad</h2>
            </div>
            <p className="ts-orb-section-copy">
              The first release stays within the four Bengaluru markets
              supported by the current property database.
            </p>
          </div>
          <div className="ts-orb-markets">
            {['Sarjapur Road', 'Bellandur', 'Marathahalli', 'Haralur'].map(
              (area, index) => (
                <div key={area} className="ts-orb-principle">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    0{index + 1}
                  </span>
                  <h3>{area}</h3>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section id="evidence" className="ts-orb-blue scroll-mt-24">
        <div className="ts-orb-shell">
          <h2>Evidence when it exists. Honesty when it doesn’t.</h2>
          <div className="mx-auto max-w-2xl space-y-4 text-center text-[#DCE3FF]">
            <p>
              Owners privately share what they paid. FlatData is designed to
              pool those contributions anonymously with registered transactions.
              Everyone gets a price they can check.
            </p>
            <p>
              Registered transactions and private owner contributions now use
              secure production storage. Owner prices appear publicly only as
              anonymous ranges after admin approval and the privacy threshold is
              met.
            </p>
          </div>
        </div>
      </section>

      <footer className="ts-orb-footer">
        <div className="ts-orb-shell flex justify-between gap-5">
          <a href="#home" className="ts-orb-brand" aria-label="FlatData home">
            <BrandWordmark />
          </a>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3"
            aria-label="Footer navigation"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
            <p>
              We don&apos;t take money from brokers or developers. There is
              nobody for us to please except you.
            </p>
            <p className="mt-1">Property intelligence, not financial advice.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
