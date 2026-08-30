import type { Metadata } from 'next';
import { DM_Mono, DM_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });
const dmMono = DM_Mono({ variable: '--font-dm-mono', subsets: ['latin'], weight: ['400', '500'] });
const instrumentSerif = Instrument_Serif({ variable: '--font-instrument-serif', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'),
  ),
  title: 'TrueSquare — Bengaluru Property Intelligence',
  description: 'Independent pricing intelligence for gated Bengaluru societies, built from registered transaction evidence without brokers, developer ads, or paid rankings.',
  openGraph: {
    title: 'TrueSquare',
    description: 'Bengaluru property intelligence',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrueSquare',
    description: 'Bengaluru property intelligence',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} antialiased`}>{children}</body></html>;
}
