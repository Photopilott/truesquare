'use client';

import { useState } from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import Link from 'next/link';

import { BrandWordmark } from '@/components/brand-wordmark';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export const siteNavigation = [
  { label: 'HOME', href: '/' },
  { label: 'OWNERS', href: '/owner' },
  { label: 'BUYERS', href: '/buyer' },
  { label: 'FLAT PRICE VERIFIED', href: '/explore' },
  { label: 'NEW FLATS R&D', href: '/atlas' },
  { label: 'DEVELOPER RATINGS', href: '/developer-ratings.html' },
] as const;

function Mark() {
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-[11px] bg-foreground"
      aria-hidden="true"
    >
      <span className="size-3 rounded-full bg-background" />
    </span>
  );
}

export function SiteHeader({
  variant = 'default',
}: {
  variant?: 'default' | 'homepage';
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`ts-orb ts-orb-sticky-header${variant === 'homepage' ? ' ts-home-drafting-header' : ''}`}
    >
      <div className="ts-orb-announcement">
        <strong>INDEPENDENT</strong>
        <span>No listings sold. No leads sold. No data sold.</span>
      </div>
      <header className="ts-orb-shell ts-orb-nav">
        <Link href="/" className="ts-orb-brand" aria-label="FlatData home">
          <BrandWordmark />
        </Link>

        <nav className="ts-orb-nav-links" aria-label="Main navigation">
          {siteNavigation.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/#paths"
            className="ts-orb-button ts-orb-button-dark ts-orb-button-small"
          >
            GET STARTED
          </Link>
        </nav>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                className="lg:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu className="size-[18px]" />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[86%] border-border bg-background p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border px-6 py-6 text-left">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3"
                aria-label="FlatData home"
              >
                <Mark />
                <SheetTitle className="text-2xl font-normal">
                  <BrandWordmark />
                </SheetTitle>
              </Link>
              <SheetDescription className="pt-3 leading-relaxed">
                Independent Bengaluru property intelligence.
              </SheetDescription>
            </SheetHeader>
            <nav
              className="flex flex-col px-4 py-4"
              aria-label="Mobile navigation"
            >
              {siteNavigation.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-14 items-center justify-between rounded-[8px] px-4 text-[15px] font-medium hover:bg-secondary"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    0{index + 1}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="mt-auto p-5">
              <Link
                onClick={() => setMenuOpen(false)}
                href="/#paths"
                className="flex h-14 items-center justify-center gap-3 rounded-[9px] bg-primary text-[13px] font-semibold text-primary-foreground"
              >
                CHOOSE A PATH <ArrowRight className="size-4" />
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </div>
  );
}
