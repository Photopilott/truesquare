import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
  metadataBase: new URL('https://bengaluru-flat-atlas.luthratushar999.chatgpt.site'),
  title: 'Ledger · Bengaluru Urban public record',
  description: 'Declared residential inventory, project timelines, builder history and record gaps from Karnataka RERA public filings.',
  openGraph: {
    title: 'Ledger · Bengaluru Urban public record',
    description: 'Declared residential inventory, project timelines, builder history and record gaps from Karnataka RERA public filings.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Ledger · Indian real estate public record' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ledger · Bengaluru Urban public record',
    description: 'Declared residential inventory, project timelines and builder history from Karnataka RERA.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
