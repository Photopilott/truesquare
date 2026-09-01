'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';

import { AppHeader } from '@/components/property-intelligence-app';
import { SocietyShare } from '@/components/society-share';
import { SocietySubscribe } from '@/components/society-subscribe';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  compactInr,
  evidenceDate,
  wholeInr,
  type PublicSocietyEvidence,
} from '@/lib/society-evidence';

export function SocietyLanding({
  evidence,
  referralShareId,
}: {
  evidence: PublicSocietyEvidence;
  referralShareId: string | null;
}) {
  const ownerParams = new URLSearchParams({
    society: evidence.society.slug,
    source: 'whatsapp',
  });
  if (referralShareId) ownerParams.set('ref', referralShareId);

  useEffect(() => {
    if (!referralShareId) return;
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'shared_link_opened',
        shareId: referralShareId,
        contentType: 'society',
        contentId: evidence.society.slug,
        sourceScreen: 'society_page',
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [evidence.society.slug, referralShareId]);

  return (
    <main className="ts-orb min-h-screen">
      <AppHeader />
      <div className="ts-orb-shell ts-orb-section">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
            <section>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{evidence.society.location}</Badge>
                <Badge variant="outline">
                  {evidence.confidence} confidence
                </Badge>
              </div>
              <p className="mt-7 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
                REGISTERED SOCIETY BENCHMARK
              </p>
              <h1 className="mt-3 font-heading text-[46px] font-normal leading-[0.95] tracking-[-0.03em] sm:text-6xl">
                {evidence.society.name}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                A public benchmark built from registered sale evidence. It is
                not a listing price, broker quote, or formal appraisal.
              </p>

              <Card className="mt-8 border-0 bg-primary text-primary-foreground ring-0">
                <CardHeader>
                  <p className="font-mono text-[10px] tracking-[0.12em] text-primary-foreground/60">
                    12-MONTH MEDIAN REGISTERED PRICE
                  </p>
                  <CardTitle className="mt-2 font-heading text-5xl sm:text-6xl">
                    {compactInr(evidence.registeredMedianPrice)}
                  </CardTitle>
                  <p className="text-sm text-primary-foreground/65">
                    12 months ending {evidenceDate(evidence.evidenceWindowEnd)}
                  </p>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-5 border-t border-white/12 pt-5 sm:grid-cols-3">
                  <Metric
                    label="Latest / sq ft"
                    value={wholeInr(evidence.latestRegisteredPricePerSqFt)}
                  />
                  <Metric
                    label="Latest flat sold"
                    value={compactInr(evidence.latestRegisteredPrice)}
                  />
                  <Metric
                    label="12-month sales"
                    value={`${evidence.registeredCount}`}
                  />
                  <Metric label="Confidence" value={evidence.confidence} />
                  <Metric
                    label="Latest evidence"
                    value={evidenceDate(evidence.latestEvidenceDate)}
                  />
                  <Metric
                    label="BHKs found"
                    value={evidence.bhks.join(', ') || 'Sparse'}
                  />
                </CardContent>
              </Card>

              <div className="mt-7 flex flex-wrap items-start gap-4">
                <SocietyShare
                  evidence={evidence}
                  sourceScreen="society_page"
                  buttonLabel="Share this benchmark"
                />
                <SocietySubscribe
                  society={evidence.society}
                  sourceScreen="society_page"
                />
              </div>
            </section>

            <aside className="rounded-[14px] border border-[#A9DCB8] bg-accent p-6 sm:p-7">
              <p className="font-mono text-[10px] tracking-[0.12em] text-accent-foreground">
                OWN A FLAT HERE?
              </p>
              <h2 className="mt-3 font-heading text-3xl leading-tight">
                See what your own flat may be worth—privately.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Add your flat details to get a private estimated value, gain or
                loss, and return after costs. Your result is for you—not the
                WhatsApp group.
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex gap-2">
                  <CheckCircle2 className="size-5 shrink-0 text-accent-foreground" />
                  Society already selected
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="size-5 shrink-0 text-accent-foreground" />
                  Personal valuation and returns first
                </li>
                <li className="flex gap-2">
                  <LockKeyhole className="size-5 shrink-0 text-accent-foreground" />
                  Your flat price stays private. Always.
                </li>
              </ul>
              <Link
                href={`/owner?${ownerParams.toString()}`}
                className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-[9px] bg-primary px-5 text-sm font-semibold text-primary-foreground"
                onClick={() => {
                  void fetch('/api/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      eventName: 'referred_owner_started',
                      shareId: referralShareId,
                      contentType: 'society',
                      contentId: evidence.society.slug,
                      sourceScreen: 'society_page',
                    }),
                    keepalive: true,
                  }).catch(() => undefined);
                }}
              >
                Check my flat&apos;s private value{' '}
                <ArrowRight className="size-4" />
              </Link>
              <p className="mt-3 text-center text-xs font-medium text-accent-foreground">
                Nothing about your flat is posted back to WhatsApp.
              </p>
            </aside>
          </div>

          <section className="mt-12">
            <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              EVIDENCE INCLUDED
            </p>
            <h2 className="mt-2 font-heading text-3xl">
              Recent registered sales
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...evidence.registeredRecords]
                .sort((a, b) =>
                  (b.registrationDate ?? '').localeCompare(
                    a.registrationDate ?? '',
                  ),
                )
                .slice(0, 6)
                .map((record) => (
                  <Card key={record.id} size="sm">
                    <CardHeader>
                      <Badge
                        variant="secondary"
                        className="w-fit rounded-[2px]"
                      >
                        {record.bhk ?? 'BHK unavailable'} BHK
                      </Badge>
                      <CardTitle className="mt-2 text-3xl">
                        {compactInr(record.price)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <Metric
                        label="Registered"
                        value={evidenceDate(record.registrationDate)}
                      />
                      <Metric
                        label="Price / sq ft"
                        value={wholeInr(record.pricePerSqFt)}
                      />
                      <Metric
                        label="Area"
                        value={
                          record.effectiveArea
                            ? `${record.effectiveArea.toLocaleString('en-IN')} sq ft`
                            : 'Unavailable'
                        }
                      />
                      <Metric label="Unit" value="Hidden" />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-current/60">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
