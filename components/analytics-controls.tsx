'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import {
  trackAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsParams,
} from '@/lib/analytics';

export function AnalyticsAnchor({
  href,
  eventName,
  eventParams,
  children,
  className,
  target,
  rel,
}: {
  href: string;
  eventName: AnalyticsEventName;
  eventParams?: AnalyticsParams;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={() => trackAnalyticsEvent(eventName, eventParams)}
    >
      {children}
    </a>
  );
}

export function AnalyticsEventOnView({
  eventName,
  eventParams,
  targetId,
}: {
  eventName: AnalyticsEventName;
  eventParams?: AnalyticsParams;
  targetId?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    function send() {
      if (sent.current) return;
      sent.current = true;
      trackAnalyticsEvent(eventName, eventParams);
    }

    if (!targetId) {
      send();
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          send();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [eventName, eventParams, targetId]);

  return null;
}
