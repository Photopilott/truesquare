import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProjectRead } from '@/components/ledger/project-read';
import { getFiling } from '@/lib/ledger-data';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getFiling(slug);
  if (!project) return { title: 'Record not found · Ledger' };
  return {
    title: `${project.name} · Ledger`,
    description: `${project.name}, reproduced from the Karnataka RERA public record with filed dates, flat inventory and named absences.`,
    openGraph: { images: [] },
    twitter: { images: [] },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getFiling(slug);
  if (!project) notFound();
  return <ProjectRead project={project} />;
}
