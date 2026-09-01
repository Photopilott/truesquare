'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

import {
  analyticsModule,
  safeAnalyticsPageLocation,
  sanitizeAnalyticsParams,
  trackAnalyticsEvent,
} from '@/lib/analytics';

function safeButtonId(element: HTMLElement) {
  const candidate =
    element.dataset.analyticsId ||
    element.getAttribute('aria-label') ||
    element.textContent ||
    element.tagName;
  return candidate
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function safeDestination(element: HTMLElement) {
  if (!(element instanceof HTMLAnchorElement)) return 'button';
  const href = element.getAttribute('href') || '';
  if (href.startsWith('#')) return href.slice(0, 100);
  try {
    const target = new URL(href, window.location.origin);
    return target.origin === window.location.origin
      ? target.pathname.slice(0, 100)
      : target.hostname.slice(0, 100);
  } catch {
    return 'link';
  }
}

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag =
      window.gtag ??
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };

    if (window.__flatdataGaConfigured !== measurementId) {
      window.gtag('js', new Date());
      window.__flatdataGaConfigured = measurementId;
    }
    window.gtag('config', measurementId, {
      send_page_view: false,
      page_location: safeAnalyticsPageLocation(window.location.href),
      page_title: document.title,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      ads_data_redaction: true,
    });

    window.gtag('event', 'page_view', {
      ...sanitizeAnalyticsParams({
        page_title: document.title,
        page_location: safeAnalyticsPageLocation(window.location.href),
        page_path: pathname,
        module: analyticsModule(pathname),
      }),
      transport_type: 'beacon',
    });

    const query = new URLSearchParams(window.location.search);
    const authMode = query.get('authMode');
    const authMethod = query.get('authMethod');
    const context = query.get('resumeGate');
    if (
      query.get('auth') === 'success' &&
      (authMode === 'sign_up' || authMode === 'login') &&
      authMethod === 'google'
    ) {
      const dedupeKey = `flatdata-ga-auth:${pathname}:${authMode}:${context ?? ''}`;
      if (!window.sessionStorage.getItem(dedupeKey)) {
        trackAnalyticsEvent(authMode, {
          method: 'google',
          context: context ?? 'unknown',
        });
        window.sessionStorage.setItem(dedupeKey, '1');
      }
    }
  }, [measurementId, pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const control = origin.closest<HTMLElement>('a, button');
      if (!control || control.dataset.analyticsIgnore === 'true') return;
      const buttonId = safeButtonId(control);
      if (!buttonId) return;
      trackAnalyticsEvent('button_click', {
        button_id: buttonId,
        destination: safeDestination(control),
      });
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      strategy="afterInteractive"
    />
  );
}
