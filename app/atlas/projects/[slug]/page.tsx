import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectRead } from '@/components/atlas/project-read';
import { getFiling } from '@/lib/atlas-data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getFiling(slug);
  if (!project) return { title: 'Record not found · Atlas · FlatData' };
  return {
    title: `${project.name} · Atlas · FlatData`,
    description: `${project.name}, reproduced from the Karnataka RERA public record with filed dates, flat inventory and named absences.`,
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
  const project = getFiling(slug);
  if (!project) notFound();
  return <ProjectRead project={project} />;
}
