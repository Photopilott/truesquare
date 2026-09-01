import type { Metadata } from 'next';
import { DM_Sans, Newsreader, Silkscreen } from 'next/font/google';

import { GoogleAnalytics } from '@/components/google-analytics';
import './globals.css';

const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: 'variable',
  axes: ['opsz'],
});
const silkscreen = Silkscreen({
  variable: '--font-silkscreen',
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000'),
  ),
  title: 'FlatData — Bengaluru Property Intelligence',
  description:
    'Independent pricing intelligence for gated Bengaluru societies, built from registered transaction evidence without brokers, developer ads, or paid rankings.',
  openGraph: {
    title: 'FlatData',
    description: 'Bengaluru property intelligence',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlatData',
    description: 'Bengaluru property intelligence',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configuredMeasurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const measurementId =
    configuredMeasurementId && /^G-[A-Z0-9]+$/i.test(configuredMeasurementId)
      ? configuredMeasurementId
      : null;
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${newsreader.variable} ${silkscreen.variable} antialiased`}
      >
        {children}
        {measurementId ? (
          <GoogleAnalytics measurementId={measurementId} />
        ) : null}
      </body>
    </html>
  );
}
