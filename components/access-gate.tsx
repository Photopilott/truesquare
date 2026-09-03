'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackAnalyticsEvent } from '@/lib/analytics';

type GateContext = 'owner' | 'buyer' | 'subscription';
type SessionPayload = {
  authenticated: boolean;
  googleConfigured: boolean;
  user?: {
    email: string;
    displayName: string | null;
    pictureUrl: string | null;
    provider: 'google' | 'email_otp';
  };
  consent?: { owner: boolean; buyer: boolean; subscription: boolean };
};

export function AccessGate({
  open,
  onOpenChange,
  context,
  onAuthorized,
  actionPending,
  actionError,
  subject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: GateContext;
  onAuthorized: () => Promise<void> | void;
  actionPending: boolean;
  actionError: string;
  subject?: string;
}) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const gateViewTracked = useRef(false);

  const loadSession = useCallback(async () => {
    setLoadingSession(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const payload = (await response.json()) as SessionPayload & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Unable to check your account.');
      setSession(payload);
      setAccepted(Boolean(payload.consent?.[context]));
      if (payload.user?.email) setEmail(payload.user.email);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to check your account.',
      );
    } finally {
      setLoadingSession(false);
    }
  }, [context]);

  useEffect(() => {
    if (!open) {
      gateViewTracked.current = false;
      return;
    }
    if (!gateViewTracked.current) {
      trackAnalyticsEvent('auth_gate_view', { context });
      gateViewTracked.current = true;
    }
    const frame = window.requestAnimationFrame(() => void loadSession());
    return () => window.cancelAnimationFrame(frame);
  }, [context, loadSession, open]);

  async function requestOtp() {
    trackAnalyticsEvent('auth_method_selected', {
      method: 'email_otp',
      context,
    });
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/email/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as {
        challengeId?: string;
        error?: string;
      };
      if (!response.ok || !payload.challengeId)
        throw new Error(payload.error || 'Unable to send the code.');
      setChallengeId(payload.challengeId);
      setOtp('');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to send the code.',
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyOtp() {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/email/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, email, otp }),
      });
      const payload = (await response.json()) as {
        error?: string;
        newUser?: boolean;
      };
      if (!response.ok)
        throw new Error(payload.error || 'Unable to verify the code.');
      trackAnalyticsEvent(payload.newUser ? 'sign_up' : 'login', {
        method: 'email_otp',
        context,
      });
      setChallengeId('');
      setOtp('');
      await loadSession();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to verify the code.',
      );
    } finally {
      setAuthBusy(false);
    }
  }

  function continueWithGoogle() {
    trackAnalyticsEvent('auth_method_selected', {
      method: 'google',
      context,
    });
    const params = new URLSearchParams(window.location.search);
    params.set('resumeGate', context);
    params.delete('auth');
    params.delete('authError');
    params.delete('authMode');
    params.delete('authMethod');
    const returnTo = `${window.location.pathname}?${params.toString()}`;
    window.location.assign(
      `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  async function signOut() {
    setAuthBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession((current) =>
      current
        ? {
            ...current,
            authenticated: false,
            user: undefined,
            consent: undefined,
          }
        : current,
    );
    setAccepted(false);
    setAuthBusy(false);
  }

  async function acceptAndContinue() {
    if (!accepted || !session?.authenticated) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      if (!session.consent?.[context]) {
        const response = await fetch('/api/auth/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, accepted: true }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok)
          throw new Error(payload.error || 'Consent could not be recorded.');
        setSession((current) =>
          current
            ? {
                ...current,
                consent: {
                  owner: current.consent?.owner ?? false,
                  buyer: current.consent?.buyer ?? false,
                  subscription: current.consent?.subscription ?? false,
                  [context]: true,
                },
              }
            : current,
        );
      }
      trackAnalyticsEvent('access_verified', { context });
      trackAnalyticsEvent('consent_complete', {
        context,
        consent_state: session.consent?.[context] ? 'existing' : 'new',
      });
      await onAuthorized();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to continue.',
      );
    } finally {
      setAuthBusy(false);
    }
  }

  const busy = authBusy || actionPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:p-7">
        <DialogHeader>
          <div className="mb-2 grid size-12 place-items-center rounded-[17px] bg-primary text-primary-foreground">
            <LockKeyhole className="size-5" />
          </div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
            {context === 'subscription'
              ? 'PRICE UPDATE ACCESS'
              : 'VERIFIED ACCESS'}
          </p>
          <DialogTitle>
            {context === 'subscription'
              ? `Get ${subject ?? 'society'} price updates`
              : 'Sign in to unlock intelligence'}
          </DialogTitle>
          <DialogDescription>
            {context === 'subscription' ? (
              <>
                Verify your email once. We will email you only when FlatData
                adds new price evidence for {subject ?? 'this society'}.
              </>
            ) : (
              <>
                Use Google, or verify any email with a one-time code. We ask
                only for a verified email—never your phone number.{' '}
                {context === 'owner' &&
                  'If approved, your price will support the public society benchmark without showing your identity or contact details.'}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {context === 'subscription' ? (
          <div className="space-y-2 rounded-[10px] border border-border bg-accent p-4 text-sm">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              New admin-approved owner benchmark and latest pricing
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              Latest verified transaction pricing
            </p>
            <p className="flex items-start gap-2 font-medium">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              No spam. No calls. No sale of your data. Only evidence.
            </p>
          </div>
        ) : null}

        {loadingSession ? (
          <div className="grid min-h-32 place-items-center">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : session?.authenticated && session.user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-accent p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4" /> Verified account
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.user.email} ·{' '}
                  {session.user.provider === 'google' ? 'Google' : 'Email OTP'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                disabled={busy}
              >
                <LogOut /> Switch
              </Button>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-secondary p-4 text-sm leading-relaxed">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-primary"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                {context === 'subscription'
                  ? `Email me when FlatData adds a new admin-approved owner benchmark or verified sale for ${subject ?? 'this society'}. No spam, calls, or sale of my data—only evidence.`
                  : 'I accept the data covenant. If an admin approves my submission, my price may be included immediately in the public society and BHK benchmark. My identity, contact details, floor, loan details, and private valuation will not be shown or sold.'}
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              className="h-13 w-full"
              onClick={continueWithGoogle}
              disabled={busy || !session?.googleConfigured}
            >
              <span className="grid size-5 place-items-center rounded-full bg-white text-xs font-bold text-primary">
                G
              </span>
              {session?.googleConfigured
                ? 'Continue with Google'
                : 'Google sign-in needs setup'}
            </Button>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or use email OTP
              <span className="h-px flex-1 bg-border" />
            </div>
            {!challengeId ? (
              <div className="space-y-2">
                <Label htmlFor="access-email">Email address</Label>
                <div className="flex gap-2">
                  <Input
                    id="access-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                  <Button
                    variant="outline"
                    onClick={() => void requestOtp()}
                    disabled={busy || !email.trim()}
                  >
                    <Mail /> Send code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="access-otp">Six-digit code</Label>
                  <Input
                    id="access-otp"
                    className="mt-2 text-center font-mono text-xl tracking-[0.35em]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sent to {email}. The code expires in 10 minutes.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setChallengeId('');
                      setOtp('');
                    }}
                    disabled={busy}
                  >
                    Change email
                  </Button>
                  <Button
                    onClick={() => void verifyOtp()}
                    disabled={busy || otp.length !== 6}
                  >
                    {busy ? <LoaderCircle className="animate-spin" /> : null}{' '}
                    Verify code
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {(authError || actionError) && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Unable to continue</AlertTitle>
            <AlertDescription>{authError || actionError}</AlertDescription>
          </Alert>
        )}

        {session?.authenticated && (
          <DialogFooter className="sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button
              className="h-13 w-full font-mono text-[11px] tracking-[0.1em]"
              disabled={!accepted || busy}
              onClick={() => void acceptAndContinue()}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              {actionPending
                ? 'SAVING SECURELY…'
                : context === 'owner'
                  ? 'SAVE & SEE MY VALUATION'
                  : context === 'buyer'
                    ? 'SEE SUPPORTING TRANSACTIONS'
                    : 'SUBSCRIBE FOR PRICE UPDATES'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
