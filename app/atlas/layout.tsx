import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './atlas.css';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Atlas · Bengaluru Urban public record · FlatData',
  description:
    'Declared residential inventory, project timelines, builder history and record gaps from Karnataka RERA public filings.',
};

export default function AtlasLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${geist.variable} ${geistMono.variable} atlas-root`}>
      {children}
    </div>
  );
}
