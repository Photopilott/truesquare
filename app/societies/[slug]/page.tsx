import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { SocietyLanding } from '@/components/society-landing';
import {
  getAllSocietySummaries,
  getPublicSocietyEvidence,
} from '@/lib/society-evidence-data';
import { compactInr } from '@/lib/society-evidence';
import { UUID_PATTERN } from '@/lib/share-tracking';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return getAllSocietySummaries().map((society) => ({ slug: society.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const evidence = await getPublicSocietyEvidence(slug);
  if (!evidence) return {};
  const canonicalSlug = evidence.society.slug;
  const description = `${evidence.society.name} verified price benchmark: ${compactInr(evidence.benchmarkMedianPrice)}, based on ${evidence.benchmarkEvidenceCount} registered and approved owner evidence points. Owner identities are never displayed.`;
  return {
    title: `${evidence.society.name} latest price benchmark — FlatData`,
    description,
    alternates: { canonical: `/societies/${canonicalSlug}` },
    openGraph: {
      title: `${evidence.society.name} · Latest registered price benchmark`,
      description,
      type: 'website',
      url: `/societies/${canonicalSlug}`,
      images: [`/societies/${canonicalSlug}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${evidence.society.name} · Latest registered price benchmark`,
      description,
      images: [`/societies/${canonicalSlug}/opengraph-image`],
    },
  };
}

export default async function SocietyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const evidence = await getPublicSocietyEvidence(slug);
  if (!evidence) notFound();
  const referralShareId =
    typeof query.ref === 'string' && UUID_PATTERN.test(query.ref)
      ? query.ref
      : null;
  if (evidence.society.slug !== slug) {
    const referral = referralShareId ? `?ref=${referralShareId}` : '';
    permanentRedirect(`/societies/${evidence.society.slug}${referral}`);
  }
  return (
    <SocietyLanding evidence={evidence} referralShareId={referralShareId} />
  );
}
