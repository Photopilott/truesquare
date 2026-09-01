import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectRead } from '@/components/atlas/project-read';
import { getAtlasProjectRead } from '@/lib/atlas-data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const read = await getAtlasProjectRead(slug);
  if (!read) return { title: 'Record not found · Atlas · FlatData' };
  return {
    title: `${read.project.name} · Atlas · FlatData`,
    description: `${read.project.name}, reproduced from the Karnataka RERA public record with filed dates, flat inventory and named absences.`,
    openGraph: { images: [] },
    twitter: { images: [] },
  };
}

export default async function AtlasProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const read = await getAtlasProjectRead(slug);
  if (!read) notFound();
  return <ProjectRead {...read} />;
}
