import type { Metadata } from 'next';

import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Privacy & Terms — FlatData',
  description:
    'FlatData’s data sources, privacy practices, and terms governing access and use.',
};

const sources = [
  {
    title: 'Karnataka RERA',
    copy: 'Public project filings, developer details, declared timelines, inventory, land area, planning authority, and complaints.',
  },
  {
    title: 'Registered transaction evidence',
    copy: 'Government registration records and reviewed source files containing sale dates, values, configurations, and areas.',
  },
  {
    title: 'Owner-verified evidence',
    copy: 'Purchase information voluntarily submitted by owners, verified by email, and reviewed before public use.',
  },
  {
    title: 'Location references',
    copy: 'Filed coordinates, Google Maps, and OpenStreetMap information used for maps, nearby features, and supporting location research.',
  },
  {
    title: 'FlatData calculations',
    copy: 'Medians, price per square foot, anonymous ranges, confidence indicators, area conversions, distances, timelines, and cleaned project or developer groupings.',
  },
];

const privacySections = [
  {
    title: 'Information we collect and why',
    copy: [
      'Depending on how you use FlatData, we may collect your verified email, Google profile details provided during sign-in, consent and session records, property submissions, report requests, subscriptions, feedback, and basic security records. We use this information to provide the service, review owner evidence, calculate anonymous benchmarks, send requested emails, improve FlatData, and prevent fraud, scraping, or abuse.',
      'Limited analytics may include pages viewed, buttons used, visit source, device category, and broad location. We do not intentionally send your email, purchase price, loan details, property submission, or private valuation to analytics. We do not sell personal information or provide user contact details to brokers, developers, agents, or lead buyers.',
    ],
  },
  {
    title: 'What is public and what stays private',
    copy: [
      'Public pages may show registered transaction evidence, anonymous owner-supported ranges, medians, evidence counts, and derived calculations. Owner contributions are reviewed before they can support a public benchmark.',
      'We do not intentionally publish a contributor’s email, identity, loan information, private valuation, or unit-level details. FlatData calculations are informational and are not government valuations or guarantees.',
    ],
  },
  {
    title: 'Storage, cookies, and your choices',
    copy: [
      'We use essential cookies, access controls, email verification, protected administrator access, and reasonable safeguards. Information is retained only while reasonably needed to provide the service, maintain the evidence record, meet legal obligations, resolve disputes, or prevent abuse. No online service can promise absolute security.',
      'You may ask to access, correct, or delete eligible information linked to your email, withdraw optional emails, or raise a privacy complaint. FlatData is intended for people aged 18 or above. We may preserve or disclose information where required by applicable law or a valid government request.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="ts-orb min-h-screen">
      <SiteHeader />

      <article className="ts-orb-shell max-w-5xl py-12 sm:py-16">
        <header className="max-w-3xl">
          <p className="ts-orb-eyebrow">
            PRIVACY &amp; TERMS · UPDATED 6 SEPTEMBER 2026
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-[0.98] tracking-[-0.035em] sm:text-6xl">
            Your data stays private. Our evidence stays protected.
          </h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground sm:text-base">
            This notice explains where FlatData&apos;s information comes from,
            how we handle personal data, and the rules for using the website.
          </p>
        </header>

        <section className="mt-10 border border-border bg-primary p-5 text-white shadow-[6px_6px_0_#282828] sm:p-7">
          <p className="font-mono text-[9px] text-white/80">DATA SOURCES</p>
          <h2 className="mt-3 font-heading text-3xl">
            Where the evidence comes from
          </h2>
          <div className="mt-5 grid gap-x-8 gap-y-4 text-sm leading-5 text-white/80 md:grid-cols-2">
            {sources.map((source, index) => (
              <p key={source.title} className={index === 4 ? 'md:col-span-2' : ''}>
                <strong className="text-white">{source.title}:</strong>{' '}
                {source.copy}
              </p>
            ))}
          </div>
        </section>

        <div className="mt-10 divide-y divide-border border-y border-border">
          {privacySections.map((section) => (
            <section
              key={section.title}
              className="grid gap-4 py-7 md:grid-cols-[0.8fr_1.7fr] md:gap-10"
            >
              <h2 className="font-heading text-2xl leading-tight">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                {section.copy.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <p className="ts-orb-eyebrow">TERMS OF USE</p>
          <h2 className="mt-3 font-heading text-3xl leading-none sm:text-4xl">
            Personal research is welcome. Extraction is not.
          </h2>
          <p className="mt-5 max-w-4xl text-sm leading-6 text-muted-foreground">
            By using FlatData, you agree to these Terms. You receive a limited,
            revocable right to view public pages through a normal web browser
            for personal, non-commercial property research. FlatData is not a
            broker, valuer, lender, lawyer, investment adviser, or government
            authority. Independently verify every material fact before making
            a property decision.
          </p>

          <div className="mt-7 space-y-4">
            <section className="border border-[#282828] bg-[#f7f4ed] p-5 shadow-[6px_6px_0_#fa3600] sm:p-7">
              <p className="font-mono text-[9px] text-[#fa3600]">
                NO SCRAPING · NO AUTOMATED ACCESS
              </p>
              <h3 className="mt-3 font-heading text-2xl">
                Automated collection is prohibited.
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  You must not use bots, spiders, crawlers, scripts, headless
                  browsers, browser automation, scraping tools, AI agents, or
                  third-party extraction services to access, monitor, collect,
                  download, copy, index, cache, or store FlatData pages or data.
                </p>
                <p>
                  You must not bypass authentication, CAPTCHAs, rate limits,
                  crawler instructions, or other protections; rotate accounts
                  or network identities to avoid restrictions; discover
                  private endpoints; reconstruct the database; re-identify
                  contributors; or use FlatData for lead generation, resale,
                  or a competing property-data product.
                </p>
              </div>
            </section>

            <section className="border border-[#282828] bg-[#282828] p-5 text-white shadow-[6px_6px_0_#fa3600] sm:p-7">
              <p className="font-mono text-[9px] text-[#fa3600]">
                NO AI OR MACHINE-LEARNING USE
              </p>
              <h3 className="mt-3 font-heading text-2xl">
                FlatData is not a training dataset.
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <p>
                  FlatData content and data must not be used to train,
                  fine-tune, test, evaluate, or benchmark an AI system; create
                  embeddings, datasets, vector databases, or knowledge bases;
                  power retrieval-augmented generation; ground automated
                  answers; or enrich a commercial AI product.
                </p>
                <p>
                  A general-purpose search engine may crawl public pages only
                  to create links and short snippets while obeying FlatData&apos;s
                  crawler instructions and technical limits. This exception
                  does not permit AI training, answer-engine extraction, bulk
                  caching, or property-data aggregation. Any other automated
                  use requires prior written permission.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-6 border-y border-border py-7 text-sm leading-6 text-muted-foreground md:grid-cols-2">
            <p>
              <strong className="text-foreground">Public records:</strong>{' '}
              underlying government records remain subject to their applicable
              rights. FlatData&apos;s selection, cleaning, matching,
              organisation, presentation, annotations, calculations, and
              database structure may not be copied or reconstructed. A public
              underlying record does not grant permission to scrape FlatData.
            </p>
            <p>
              <strong className="text-foreground">Enforcement:</strong>{' '}
              FlatData may block requests, suspend access, require deletion of
              improperly collected material, and pursue remedies available
              under applicable law. Submit only information you believe is
              accurate and are permitted to share.
            </p>
          </div>
        </section>

        <footer className="mt-8 text-sm leading-6 text-muted-foreground">
          <p>
            For privacy requests, corrections, permissions, or legal notices,
            email{' '}
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href="mailto:Tushar@flatdata.in"
            >
              Tushar@flatdata.in
            </a>
            . These Terms are governed by applicable Indian law.
          </p>
        </footer>
      </article>
    </main>
  );
}
