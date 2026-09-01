'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, LoaderCircle } from 'lucide-react';

import { AccessGate } from '@/components/access-gate';
import { Button } from '@/components/ui/button';

type SubscriptionStatus = {
  authenticated: boolean;
  subscribed: boolean;
  canSubscribeWithoutPrompt?: boolean;
  email?: string;
  error?: string;
};

async function fetchSubscriptionStatus(slug: string) {
  const response = await fetch(
    `/api/subscriptions?society=${encodeURIComponent(slug)}`,
    { cache: 'no-store' },
  );
  const payload = (await response.json()) as SubscriptionStatus;
  if (!response.ok)
    throw new Error(payload.error || 'Unable to check this subscription.');
  return payload;
}

function clearSubscriptionResumeState() {
  const params = new URLSearchParams(window.location.search);
  params.delete('resumeGate');
  params.delete('subscriptionSociety');
  params.delete('auth');
  params.delete('authError');
  const query = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  );
}

export function SocietySubscribe({
  society,
  sourceScreen,
  className,
}: {
  society: { slug: string; name: string };
  sourceScreen: 'society_page' | 'buyer_detail';
  className?: string;
}) {
  const [gateOpen, setGateOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function subscribe() {
    setSubscribing(true);
    setError('');
    try {
      const response = await fetch(
        `/api/subscriptions?society=${encodeURIComponent(society.slug)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceScreen }),
        },
      );
      const payload = (await response.json()) as SubscriptionStatus;
      if (!response.ok)
        throw new Error(payload.error || 'Unable to save this subscription.');
      setSubscribed(true);
      setEmail(payload.email ?? '');
      setGateOpen(false);
      clearSubscriptionResumeState();
    } finally {
      setSubscribing(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      try {
        const payload = await fetchSubscriptionStatus(society.slug);
        if (!active) return;
        setSubscribed(payload.subscribed);
        setEmail(payload.email ?? '');
      } catch {
        // The button can retry when the user interacts with it.
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkStatus();
    return () => {
      active = false;
    };
  }, [society.slug]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get('resumeGate') !== 'subscription' ||
      params.get('subscriptionSociety') !== society.slug
    )
      return;
    const frame = window.requestAnimationFrame(() => setGateOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [society.slug]);

  async function handleClick() {
    if (subscribed) return;
    setError('');
    setChecking(true);
    try {
      const status = await fetchSubscriptionStatus(society.slug);
      setSubscribed(status.subscribed);
      setEmail(status.email ?? '');
      if (status.subscribed) return;
      if (status.authenticated && status.canSubscribeWithoutPrompt) {
        await subscribe();
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.set('subscriptionSociety', society.slug);
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}?${params.toString()}${window.location.hash}`,
      );
      setGateOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to start this subscription.',
      );
    } finally {
      setChecking(false);
    }
  }

  async function stopUpdates() {
    setSubscribing(true);
    setError('');
    try {
      const response = await fetch(
        `/api/subscriptions?society=${encodeURIComponent(society.slug)}`,
        { method: 'DELETE' },
      );
      const payload = (await response.json()) as SubscriptionStatus;
      if (!response.ok)
        throw new Error(payload.error || 'Unable to stop these updates.');
      setSubscribed(false);
      setEmail('');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to stop these updates.',
      );
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={checking || subscribing || subscribed}
        onClick={() => void handleClick()}
      >
        {checking || subscribing ? (
          <LoaderCircle className="animate-spin" />
        ) : subscribed ? (
          <Check />
        ) : (
          <Bell />
        )}
        {subscribed
          ? 'Subscribed to price updates'
          : 'Subscribe for latest price update'}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        {subscribed && email
          ? `Updates will go to ${email}.`
          : 'Owner benchmarks + verified sales. No spam or calls.'}
        {subscribed ? (
          <>
            {' '}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-2"
              disabled={subscribing}
              onClick={() => void stopUpdates()}
            >
              Stop updates
            </button>
          </>
        ) : null}
      </p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <AccessGate
        open={gateOpen}
        onOpenChange={(open) => {
          setGateOpen(open);
          if (!open) clearSubscriptionResumeState();
        }}
        context="subscription"
        subject={society.name}
        onAuthorized={subscribe}
        actionPending={subscribing}
        actionError={error}
      />
    </div>
  );
}
