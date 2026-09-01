import type { Metadata } from 'next';
import Link from 'next/link';

import { BrandWordmark } from '@/components/brand-wordmark';

export const metadata: Metadata = {
  title: 'Privacy — FlatData',
  description:
    'How FlatData collects, uses, and protects account and property information.',
};

const sections = [
  {
    title: 'What we collect',
    body: [
      'Your verified email address when you sign in with Google or an email one-time code.',
      'Property information you choose to submit, including society, configuration, area, purchase date, purchase price, costs, and optional loan interest.',
      'Basic security records needed to run sign-in, consent, and abuse protection.',
      'Basic website analytics, including pages viewed, buttons clicked, visit source, device type, and broad location. We do not send your email, form entries, purchase price, loan details, or private valuation to analytics.',
    ],
  },
  {
    title: 'How we use it',
    body: [
      'To verify your account, provide property intelligence, calculate your private results, review contributed data, and improve society-level evidence.',
      'Owner contributions are reviewed before they can affect public ranges. Individual purchase prices are not published.',
      'We use aggregate website analytics to understand which pages and journeys work, where visitors leave, and which sources bring useful visits. Advertising personalisation and Google Signals are disabled.',
    ],
  },
  {
    title: 'Who receives it',
    body: [
      'We use service providers to run FlatData: Google for optional sign-in and Google Analytics, AgentMail for email codes, OpenAI Sites for hosting, and Neon for the application database.',
      'We do not sell personal data or send your details to brokers, developers, agents, or lead buyers.',
    ],
  },
  {
    title: 'Storage and control',
    body: [
      'Account and submitted property data are stored in the production database and protected by access controls. Only the authorised administrator can review individual submissions.',
      'We retain information while it is needed to provide the service, protect the platform, and maintain the evidence record. You may ask us to access, correct, or delete information linked to your email.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="ts-orb min-h-screen">
      <div className="ts-orb-announcement">
        <strong>PRIVACY</strong>
        <span>No listings sold. No leads sold. No data sold.</span>
      </div>

      <header className="ts-orb-shell ts-orb-nav">
        <Link href="/" className="ts-orb-brand" aria-label="FlatData home">
          <BrandWordmark />
        </Link>
        <Link href="/" className="ts-orb-button ts-orb-button-small">
          BACK HOME
        </Link>
      </header>

      <section className="ts-orb-shell py-16 sm:py-24">
        <p className="ts-orb-eyebrow">
          PRIVACY NOTICE · UPDATED 1 SEPTEMBER 2026
        </p>
        <h1 className="mt-5 max-w-4xl font-heading text-5xl leading-[0.98] tracking-[-0.04em] sm:text-7xl">
          Your property data stays private by default.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          This notice explains what FlatData collects, why it is needed, and how
          it is protected when you use the service.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <article key={section.title} className="ts-panel p-6 sm:p-8">
              <p className="font-mono text-[10px] text-muted-foreground">
                0{index + 1}
              </p>
              <h2 className="mt-4 font-heading text-3xl">{section.title}</h2>
              <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-5 border border-border bg-[#2f50d2] p-7 text-white shadow-[8px_8px_0_#15110d] sm:p-10">
          <p className="font-mono text-[10px] text-[#dce3ff]">
            QUESTIONS OR REQUESTS
          </p>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
            Contact FlatData
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#dce3ff]">
            Email{' '}
            <a
              className="underline underline-offset-4"
              href="mailto:Tushar@flatdata.in"
            >
              Tushar@flatdata.in
            </a>{' '}
            for privacy questions or requests concerning information linked to
            your account.
          </p>
        </section>
      </section>
    </main>
  );
}
