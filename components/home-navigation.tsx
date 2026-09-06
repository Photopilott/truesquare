'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { BrandWordmark } from '@/components/brand-wordmark';
import { EvidenceStack } from '@/components/evidence-stack';
import { SiteHeader, siteNavigation } from '@/components/site-header';
import { trackAnalyticsEvent } from '@/lib/analytics';
import courtyardSketch from '@/public/images/apartment-sketch-courtyard-portrait.jpg';

export function HomeNavigation() {
  return (
    <main id="home" className="ts-orb min-h-screen overflow-x-clip">
      <SiteHeader variant="homepage" />

      <section className="ts-orb-shell ts-orb-hero ts-orb-hero-single ts-home-drafting-hero">
        <div className="ts-home-drafting-copy">
          <p className="ts-orb-eyebrow">
            FOR FIRST-TIME BUYERS · POWERED BY CURRENT OWNERS
          </p>
          <h1 className="ts-orb-hero-title">
            Make your first property decision with evidence.
          </h1>
          <p className="ts-orb-hero-copy">
            <strong className="ts-home-hero-highlight">
              FlatData is real-estate intelligence for buyers &amp; owners
            </strong>
            . We provide registered public records and deep project research—so
            you see the full story before you take a decision
          </p>
          <div className="ts-orb-hero-actions">
            <Link
              href="/buyer"
              className="ts-orb-button ts-orb-button-dark"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_check_society_price',
                  destination: '/buyer',
                })
              }
            >
              CHECK A SOCIETY&apos;S REAL PRICE{' '}
              <ArrowRight className="size-4 shrink-0" />
            </Link>
            <Link
              href="/owner"
              className="ts-orb-button"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_find_flat_worth',
                  destination: '/owner',
                })
              }
            >
              FIND WHAT MY FLAT IS WORTH{' '}
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          </div>
        </div>

        <figure
          className="ts-home-drafting-visual"
          aria-label="Architectural elevation sketch of a Bengaluru apartment building"
        >
          <div className="ts-home-drafting-image">
            <Image
              src={courtyardSketch}
              alt="Hand-drawn architectural elevation of a three-floor apartment building"
              fill
              priority
              unoptimized
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

      <section className="ts-home-problem">
        <div className="ts-orb-shell">
          <div className="ts-home-problem-layout">
            <div className="ts-home-problem-heading">
              <p className="ts-orb-eyebrow">THE PROBLEM</p>
              <h2>
                Your biggest purchase begins with somebody else&apos;s number.
              </h2>
            </div>
            <div className="ts-home-problem-story">
              <p>A developer gives you a quote.</p>
              <p>A portal gives you an asking price.</p>
              <p>A broker gives you an opinion.</p>
              <p className="ts-home-problem-callout">
                But none of them has to show you what comparable flats actually
                sold for.
              </p>
            </div>
          </div>

          <div className="ts-home-problem-cards">
            <article>
              <p className="ts-home-fold-label">01 · DEVELOPER</p>
              <blockquote>“This price is only valid today.”</blockquote>
              <p>Urgency is not evidence.</p>
            </article>
            <article>
              <p className="ts-home-fold-label">02 · PORTAL</p>
              <blockquote>“Similar homes start at…”</blockquote>
              <p>An asking price is not a sale price.</p>
            </article>
            <article>
              <p className="ts-home-fold-label">03 · BROKER</p>
              <blockquote>“Trust me. This is the market rate.”</blockquote>
              <p>Good advice should survive a fact-check.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="evidence" className="ts-home-record scroll-mt-24">
        <span id="paths" className="ts-home-anchor scroll-mt-24" />
        <div className="ts-orb-shell">
          <p className="ts-orb-eyebrow">WHAT FLATDATA GIVES YOU</p>
          <h2>
            The missing second opinion: <em>the public record.</em>
          </h2>

          <div className="ts-home-record-grid">
            <article>
              <p className="ts-home-fold-label">FOR BUYERS</p>
              <h3>Know the sale price before you negotiate.</h3>
              <p>
                Search by society, location, BHK or budget. See registered
                prices, price per square foot and the transactions behind the
                number.
              </p>
              <Link
                href="/buyer"
                onClick={() =>
                  trackAnalyticsEvent('primary_cta_click', {
                    button_id: 'home_record_buyers',
                    destination: '/buyer',
                  })
                }
              >
                RESEARCH A SOCIETY <ArrowRight className="size-3" />
              </Link>
            </article>
            <article>
              <p className="ts-home-fold-label">FOR OWNERS</p>
              <h3>Know what your flat may be worth today.</h3>
              <p>
                Add your private purchase details to see an estimated value,
                gain or loss, returns and the comparable registered sales used.
              </p>
              <Link
                href="/owner"
                onClick={() =>
                  trackAnalyticsEvent('primary_cta_click', {
                    button_id: 'home_record_owners',
                    destination: '/owner',
                  })
                }
              >
                VALUE MY FLAT <ArrowRight className="size-3" />
              </Link>
            </article>
            <article>
              <p className="ts-home-fold-label">FOR THE CURIOUS</p>
              <h3>See the market without being sold to.</h3>
              <p>
                Browse 56 supported societies across four Bengaluru
                micro-markets. No brokers, developer ads, paid rankings or
                sponsored placement.
              </p>
              <Link
                href="/buyer"
                onClick={() =>
                  trackAnalyticsEvent('primary_cta_click', {
                    button_id: 'home_record_explore',
                    destination: '/buyer',
                  })
                }
              >
                EXPLORE FREELY <ArrowRight className="size-3" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <EvidenceStack />

      <section className="ts-home-closing">
        <div className="ts-orb-shell">
          <p className="ts-orb-eyebrow">ONE LAST THING</p>
          <h2>A home is emotional. The data shouldn&apos;t be.</h2>
          <p className="ts-home-closing-copy">
            Before you buy, sell or simply wonder, look at the evidence. It may
            be the most valuable five minutes of your property decision.
          </p>
          <div className="ts-home-closing-actions">
            <Link
              href="/buyer"
              className="ts-home-closing-button ts-home-closing-button-dark"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_closing_check_society',
                  destination: '/buyer',
                })
              }
            >
              CHECK A SOCIETY&apos;S PRICE <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/owner"
              className="ts-home-closing-button"
              onClick={() =>
                trackAnalyticsEvent('primary_cta_click', {
                  button_id: 'home_closing_track_property',
                  destination: '/owner',
                })
              }
            >
              TRACK MY PROPERTY <ArrowRight className="size-3.5" />
            </Link>
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
            <Link
              href="/privacy"
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              PRIVACY &amp; TERMS
            </Link>
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
