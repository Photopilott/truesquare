'use client';

import { useCallback, useEffect, useState } from 'react';
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

type GateContext = 'owner' | 'buyer';
type SessionPayload = {
  authenticated: boolean;
  googleConfigured: boolean;
  user?: {
    email: string;
    displayName: string | null;
    pictureUrl: string | null;
    provider: 'google' | 'email_otp';
  };
  consent?: { owner: boolean; buyer: boolean };
};

export function AccessGate({
  open,
  onOpenChange,
  context,
  onAuthorized,
  actionPending,
  actionError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: GateContext;
  onAuthorized: () => Promise<void> | void;
  actionPending: boolean;
  actionError: string;
}) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [accepted, setAccepted] = useState(false);

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
    if (!open) return;
    const frame = window.requestAnimationFrame(() => void loadSession());
    return () => window.cancelAnimationFrame(frame);
  }, [loadSession, open]);

  async function requestOtp() {
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
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || 'Unable to verify the code.');
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
    const returnTo = `${window.location.pathname}?resumeGate=${context}`;
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
                  [context]: true,
                },
              }
            : current,
        );
      }
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
            VERIFIED ACCESS
          </p>
          <DialogTitle>Sign in to unlock intelligence</DialogTitle>
          <DialogDescription>
            Use Google, or verify any email with a one-time code. We ask only
            for a verified email—never your phone number.
          </DialogDescription>
        </DialogHeader>

        {loadingSession ? (
          <div className="grid min-h-32 place-items-center">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : session?.authenticated && session.user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#A9DCB8] bg-accent p-4">
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
                I accept the data covenant. My exact purchase price will not be
                shown publicly or used for advertising, targeting, broker
                access, or developer access.
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
                  : 'SEE SUPPORTING TRANSACTIONS'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
