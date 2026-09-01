'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, LockKeyhole, MessageCircle, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  compactInr,
  societyWhatsAppText,
  wholeInr,
  type PublicSocietyEvidence,
} from '@/lib/society-evidence';
import type { ShareSourceScreen } from '@/lib/share-tracking';
import { trackAnalyticsEvent } from '@/lib/analytics';

async function trackEvent(payload: Record<string, unknown>) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Sharing must still work when measurement is unavailable.
  }
}

export function SocietyShare({
  evidence,
  sourceScreen,
  buttonLabel = 'Share society benchmark',
  className,
}: {
  evidence: PublicSocietyEvidence;
  sourceScreen: ShareSourceScreen;
  buttonLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canonicalPath = `/societies/${evidence.society.slug}`;

  useEffect(() => {
    void trackEvent({
      eventName: 'share_prompt_viewed',
      contentType: 'society',
      contentId: evidence.society.slug,
      sourceScreen,
    });
  }, [evidence.society.slug, sourceScreen]);

  async function createShare() {
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'society',
          contentId: evidence.society.slug,
          sourceScreen,
          messageVariant: 'society_benchmark_private_v1',
        }),
      });
      const body = (await response.json()) as { shareId?: string };
      if (response.ok && body.shareId) return body.shareId;
    } catch {
      // Fall back to the permanent page without attribution.
    }
    return null;
  }

  async function shareUrl(method: 'whatsapp' | 'copy_link') {
    const shareId = await createShare();
    const url = new URL(canonicalPath, window.location.origin);
    url.searchParams.set(
      'utm_source',
      method === 'whatsapp' ? 'whatsapp' : 'flatdata_share',
    );
    url.searchParams.set(
      'utm_medium',
      method === 'whatsapp' ? 'messaging' : 'referral',
    );
    url.searchParams.set('utm_campaign', 'society_benchmark');
    if (shareId) url.searchParams.set('ref', shareId);
    return { shareId, url: url.toString() };
  }

  async function shareOnWhatsApp() {
    const { shareId, url } = await shareUrl('whatsapp');
    trackAnalyticsEvent('share', {
      method: 'whatsapp',
      content_type: 'society',
      content_id: evidence.society.slug,
      society_slug: evidence.society.slug,
      source_screen: sourceScreen,
    });
    void trackEvent({
      eventName: 'whatsapp_share_started',
      shareId,
      contentType: 'society',
      contentId: evidence.society.slug,
      sourceScreen,
    });
    const text = societyWhatsAppText(evidence, url);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function copyLink() {
    const { shareId, url } = await shareUrl('copy_link');
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackAnalyticsEvent('share', {
      method: 'copy_link',
      content_type: 'society',
      content_id: evidence.society.slug,
      society_slug: evidence.society.slug,
      source_screen: sourceScreen,
    });
    void trackEvent({
      eventName: 'share_link_copied',
      shareId,
      contentType: 'society',
      contentId: evidence.society.slug,
      sourceScreen,
    });
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <div className={className}>
        <Button
          type="button"
          size="lg"
          onClick={() => {
            setOpen(true);
            trackAnalyticsEvent('share_preview_opened', {
              content_type: 'society',
              content_id: evidence.society.slug,
              society_slug: evidence.society.slug,
              source_screen: sourceScreen,
            });
            void trackEvent({
              eventName: 'share_preview_opened',
              contentType: 'society',
              contentId: evidence.society.slug,
              sourceScreen,
            });
          }}
        >
          <Share2 /> {buttonLabel}
        </Button>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent-foreground">
          <LockKeyhole className="size-3.5" /> Your flat price stays private.
          Always.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg sm:p-7">
          <DialogHeader>
            <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
              WHATSAPP PREVIEW
            </p>
            <DialogTitle>Share the benchmark, not your flat price</DialogTitle>
            <DialogDescription>
              This is exactly what neighbours will see. Your personal value,
              purchase price, returns, floor, and email are never included.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[#A9DCB8] bg-accent p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground">
              Shared society benchmark
            </p>
            <h3 className="mt-2 font-heading text-2xl">
              {evidence.society.name}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">12-month median price</p>
                <p className="mt-1 font-semibold">
                  {compactInr(evidence.registeredMedianPrice)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Latest / sq ft</p>
                <p className="mt-1 font-semibold">
                  {wholeInr(evidence.latestRegisteredPricePerSqFt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Latest flat sold</p>
                <p className="mt-1 font-semibold">
                  {compactInr(evidence.latestRegisteredPrice)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">12-month sales</p>
                <p className="mt-1 font-semibold">{evidence.registeredCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Confidence</p>
                <p className="mt-1 font-semibold">{evidence.confidence}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="font-semibold">What is shared</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Society benchmark, evidence count, confidence, and date.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-semibold">What stays private</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Your flat price, valuation, returns, floor, and identity.
              </p>
            </div>
          </div>

          <p className="flex items-start gap-2 text-sm font-medium">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
            Your flat price stays private. Always. Only this society benchmark
            is shared.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Button size="lg" onClick={shareOnWhatsApp}>
              <MessageCircle /> Share on WhatsApp
            </Button>
            <Button size="lg" variant="outline" onClick={copyLink}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
