'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BrandWordmark } from '@/components/brand-wordmark';
import { EvidenceStack } from '@/components/evidence-stack';
import { SiteHeader, siteNavigation } from '@/components/site-header';
import { trackAnalyticsEvent } from '@/lib/analytics';

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

export function HomeNavigation() {
  const [selectedPath, setSelectedPath] =
    useState<(typeof paths)[number]['id']>('owner');
  const selectedHref =
    selectedPath === 'owner'
      ? '/owner'
      : selectedPath === 'buyer'
        ? '/buyer'
        : '/explore';

  return (
    <main id="home" className="ts-orb min-h-screen overflow-x-clip">
      <SiteHeader variant="homepage" />

      <section className="ts-orb-shell ts-orb-hero ts-orb-hero-single ts-home-drafting-hero">
        <div className="ts-home-drafting-copy">
          <p className="ts-orb-eyebrow">BENGALURU · REGISTERED TRANSACTIONS</p>
          <h1 className="ts-orb-hero-title">
            Make your next property decision with evidence.
          </h1>
          <p className="ts-orb-hero-copy">
            Whether you own a flat, are buying one, or are checking a developer
            or project, FlatData helps you see what the market and the public
            record actually say.
          </p>
          <div className="ts-orb-hero-actions">
            <Link
              href="/owner"
              className="ts-orb-button ts-orb-button-dark"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_find_flat_worth',
                  destination: '/owner',
                })
              }
            >
              FIND MY FLAT&apos;S WORTH{' '}
              <ArrowRight className="size-4 shrink-0" />
            </Link>
            <Link
              href="/explore"
              className="ts-orb-button"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_explore_property_data',
                  destination: '/explore',
                })
              }
            >
              EXPLORE PROPERTY DATA
            </Link>
          </div>
          <p className="ts-orb-note">
            Look around freely. You&apos;ll only need to sign in when you want
            your numbers.
          </p>
        </div>

        <figure
          className="ts-home-drafting-visual"
          aria-label="Architectural elevation sketch of a Bengaluru apartment building"
        >
          <div className="ts-home-drafting-image">
            <Image
              src="/images/apartment-sketch-courtyard-portrait.jpg"
              alt="Hand-drawn architectural elevation of a three-floor apartment building"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 44vw"
            />
          </div>
          <div className="ts-home-drafting-markers" aria-hidden="true">
            <span className="ts-home-drafting-marker ts-home-drafting-marker-a">
              01
            </span>
            <span className="ts-home-drafting-marker ts-home-drafting-marker-b">
              02
            </span>
            <span className="ts-home-drafting-marker ts-home-drafting-marker-c">
              03
            </span>
          </div>
        </figure>
      </section>

      <EvidenceStack />

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
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: `home_path_${selectedPath}`,
                  destination: selectedHref,
                })
              }
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
          <Link href="/" className="ts-orb-brand" aria-label="FlatData home">
            <BrandWordmark />
          </Link>
          <nav
            className="flex flex-wrap gap-x-6 gap-y-3"
            aria-label="Footer navigation"
          >
            {siteNavigation.map((item) => (
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
