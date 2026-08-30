import type { Metadata } from 'next';
import { Manrope, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });
const sourceSerif = Source_Serif_4({ variable: '--font-source-serif', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'TrueSquare — Bengaluru Property Intelligence',
  description: 'Independent, evidence-based apartment valuation and registered transaction intelligence for Bengaluru owners and buyers.',
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
  return <html lang="en"><body className={`${manrope.variable} ${sourceSerif.variable} antialiased`}>{children}</body></html>;
}
