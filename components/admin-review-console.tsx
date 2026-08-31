'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BrandWordmark } from '@/components/brand-wordmark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

type Contribution = {
  id: string;
  status: ReviewStatus;
  submitted_at: string;
  purchase_price: number | string;
  stamp_duty: number | string;
  registration_cost: number | string;
  interiors: number | string;
  brokerage: number | string;
  loan_amount: number | string | null;
  loan_tenure_years: number | null;
  loan_rate: number | string | null;
  email: string;
  society: string;
  location: string;
  tower: string;
  floor: string;
  bhk: string;
  area_sq_ft: number | string;
  area_type: string;
  car_parks: number;
  purchase_date: string;
  facing: string | null;
  price_per_sq_ft: number | string;
};

function formatInr(value: number | string | null, compact = false) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function AuthPanel({ adminEmail }: { adminEmail: string }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function requestOtp() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        challengeId?: string;
        error?: string;
      };
      if (!response.ok || !result.challengeId) {
        throw new Error(result.error || 'The code could not be sent.');
      }
      setChallengeId(result.challengeId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The code could not be sent.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!challengeId || otp.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, email, otp }),
      });
      const result = (await response.json()) as {
        authenticated?: boolean;
        error?: string;
      };
      if (!response.ok || !result.authenticated) {
        throw new Error(result.error || 'The code could not be verified.');
      }
      window.location.reload();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : 'The code could not be verified.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ts-orb min-h-screen">
      <header className="ts-orb-shell ts-orb-nav">
        <Link className="ts-orb-brand" href="/" aria-label="FlatData home">
          <BrandWordmark />
        </Link>
        <Link href="/" className="flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="size-4" /> Back to site
        </Link>
      </header>
      <section className="ts-orb-shell grid min-h-[calc(100vh-88px)] place-items-center py-12">
        <Card className="w-full max-w-[480px] overflow-hidden">
          <CardHeader className="border-b border-border bg-secondary p-7 sm:p-9">
            <div className="grid size-12 place-items-center rounded-[10px] border border-foreground bg-foreground text-background">
              <LockKeyhole className="size-5" />
            </div>
            <p className="mt-5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              PRIVATE ADMIN ACCESS
            </p>
            <CardTitle className="mt-2 font-heading text-4xl font-normal">
              Review owner contributions
            </CardTitle>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Only the approved administrator email can request a one-time code.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 p-7 sm:p-9">
            {!challengeId ? (
              <div className="space-y-3">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  placeholder="Enter the authorised email"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && email.trim())
                      void requestOtp();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  No password is used. A six-digit code will be emailed after
                  the address is checked.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <Alert className="border-[#A9DCB8] bg-accent">
                  <Mail />
                  <AlertTitle>Code sent</AlertTitle>
                  <AlertDescription>
                    Check {adminEmail}. The code expires in 10 minutes.
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Label>Six-digit code</Label>
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setError('');
                    }}
                    onComplete={() => undefined}
                    containerClassName="justify-center"
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="size-12 text-lg"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <X />
                <AlertTitle>Access not granted</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="h-13 w-full font-mono text-[11px] tracking-[0.1em]"
              disabled={
                busy ||
                (!challengeId && !email.trim()) ||
                (Boolean(challengeId) && otp.length !== 6)
              }
              onClick={() => void (challengeId ? verifyOtp() : requestOtp())}
            >
              {busy ? (
                <LoaderCircle className="animate-spin" />
              ) : challengeId ? (
                <ShieldCheck />
              ) : (
                <Mail />
              )}
              {busy
                ? 'PLEASE WAIT…'
                : challengeId
                  ? 'VERIFY & OPEN ADMIN'
                  : 'EMAIL ME A CODE'}
            </Button>
            {challengeId && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setChallengeId(null);
                  setOtp('');
                  setError('');
                }}
              >
                Change email
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ReviewCard({
  contribution,
  notes,
  busy,
  onNotes,
  onReview,
}: {
  contribution: Contribution;
  notes: string;
  busy: boolean;
  onNotes: (value: string) => void;
  onReview: (status: 'approved' | 'rejected') => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-[2px]">
              {contribution.location}
            </Badge>
            <Badge variant="outline" className="rounded-[2px]">
              {contribution.bhk} BHK
            </Badge>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatDate(contribution.submitted_at)}
          </span>
        </div>
        <CardTitle className="mt-3 text-2xl">{contribution.society}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tower {contribution.tower} · Floor {contribution.floor} ·{' '}
          {Number(contribution.area_sq_ft).toLocaleString('en-IN')} sq ft
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Purchase price</p>
            <p className="mt-1 font-medium">
              {formatInr(contribution.purchase_price, true)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Price / sq ft</p>
            <p className="mt-1 font-medium">
              {formatInr(contribution.price_per_sq_ft)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Purchase date</p>
            <p className="mt-1 font-medium">
              {formatDate(contribution.purchase_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Area basis</p>
            <p className="mt-1 font-medium">
              {contribution.area_type === 'carpet'
                ? 'Carpet'
                : 'Super built-up'}
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Contributor:</span>{' '}
            {contribution.email}
          </p>
          <p>
            <span className="text-muted-foreground">Facing:</span>{' '}
            {contribution.facing || 'Not supplied'}
          </p>
          <p>
            <span className="text-muted-foreground">Stamp duty:</span>{' '}
            {formatInr(contribution.stamp_duty)}
          </p>
          <p>
            <span className="text-muted-foreground">Registration:</span>{' '}
            {formatInr(contribution.registration_cost)}
          </p>
          <p>
            <span className="text-muted-foreground">Interiors:</span>{' '}
            {formatInr(contribution.interiors)}
          </p>
          <p>
            <span className="text-muted-foreground">Brokerage:</span>{' '}
            {formatInr(contribution.brokerage)}
          </p>
        </div>
        {contribution.status === 'pending' && (
          <div className="space-y-2">
            <Label htmlFor={`notes-${contribution.id}`}>
              Review notes{' '}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id={`notes-${contribution.id}`}
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
              placeholder="Record why this was approved or rejected"
              maxLength={2000}
            />
          </div>
        )}
      </CardContent>
      {contribution.status === 'pending' && (
        <CardFooter className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onReview('rejected')}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <X />} Reject
          </Button>
          <Button disabled={busy} onClick={() => onReview('approved')}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Check />}{' '}
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function Dashboard({
  adminEmail,
  sessionExpiresAt,
}: {
  adminEmail: string;
  sessionExpiresAt: string | null;
}) {
  const [status, setStatus] = useState<ReviewStatus>('pending');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [counts, setCounts] = useState<Record<ReviewStatus, number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async (selectedStatus: ReviewStatus) => {
    setLoading(true);
    setError('');
    try {
      const statuses: ReviewStatus[] = ['pending', 'approved', 'rejected'];
      const responses = await Promise.all(
        statuses.map((item) =>
          fetch(`/api/admin/contributions?status=${item}`, {
            cache: 'no-store',
          }),
        ),
      );
      if (responses.some((response) => response.status === 401)) {
        window.location.reload();
        return;
      }
      const payloads = await Promise.all(
        responses.map(
          (response) =>
            response.json() as Promise<{
              contributions?: Contribution[];
              error?: string;
            }>,
        ),
      );
      const failed = payloads.find((payload) => payload.error);
      if (failed?.error) throw new Error(failed.error);
      const nextCounts = Object.fromEntries(
        statuses.map((item, index) => [
          item,
          payloads[index].contributions?.length ?? 0,
        ]),
      ) as Record<ReviewStatus, number>;
      setCounts(nextCounts);
      setContributions(
        payloads[statuses.indexOf(selectedStatus)].contributions ?? [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load the review queue.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void loadData(status));
    return () => window.cancelAnimationFrame(frame);
  }, [loadData, status]);

  async function review(id: string, nextStatus: 'approved' | 'rejected') {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/contributions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, notes: notes[id] || '' }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error || 'The review could not be saved.');
      setMessage(
        `Contribution ${nextStatus}. Public aggregates were recalculated.`,
      );
      await loadData(status);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'The review could not be saved.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function signOut() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  return (
    <main className="ts-orb min-h-screen">
      <div className="ts-orb-announcement">
        <strong>ADMIN ONLY</strong>
        <span>
          Raw owner contributions are private and never shown publicly.
        </span>
      </div>
      <header className="ts-orb-shell ts-orb-nav">
        <Link className="ts-orb-brand" href="/" aria-label="FlatData home">
          <BrandWordmark />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {adminEmail}
          </span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <section className="ts-orb-shell ts-orb-section">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="ts-orb-eyebrow">PRIVATE REVIEW CONSOLE</p>
            <h1 className="ts-orb-page-title">Owner contribution queue</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Approve only plausible evidence. Public owner ranges appear after
              three approved contributions for the same society and BHK.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadData(status)}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>

        <div className="mb-7 grid gap-3 sm:grid-cols-3">
          {(['pending', 'approved', 'rejected'] as ReviewStatus[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className="ts-orb-choice min-h-0 p-5 text-left"
                data-active={status === item}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {item}
                </span>
                <strong className="mt-2 block font-heading text-4xl font-normal">
                  {counts[item]}
                </strong>
              </button>
            ),
          )}
        </div>

        {sessionExpiresAt && (
          <p className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" /> Session ends{' '}
            {formatDate(sessionExpiresAt)}. Sign in again after 12 hours.
          </p>
        )}
        {message && (
          <Alert className="mb-5 border-[#A9DCB8] bg-accent">
            <CheckCircle2 />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-5">
            <X />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid min-h-56 place-items-center rounded-[12px] border border-border bg-card">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : contributions.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {contributions.map((contribution) => (
              <ReviewCard
                key={contribution.id}
                contribution={contribution}
                notes={notes[contribution.id] ?? ''}
                busy={busyId === contribution.id}
                onNotes={(value) =>
                  setNotes((current) => ({
                    ...current,
                    [contribution.id]: value,
                  }))
                }
                onReview={(nextStatus) =>
                  void review(contribution.id, nextStatus)
                }
              />
            ))}
          </div>
        ) : (
          <div className="grid min-h-56 place-items-center rounded-[12px] border border-dashed border-border bg-card p-8 text-center">
            <div>
              <ShieldCheck className="mx-auto size-8 text-accent-foreground" />
              <h2 className="mt-4 font-heading text-3xl font-normal">
                No {status} contributions
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This queue is clear.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export function AdminReviewConsole({
  initiallyAuthenticated,
  adminEmail,
  sessionExpiresAt,
}: {
  initiallyAuthenticated: boolean;
  adminEmail: string;
  sessionExpiresAt: string | null;
}) {
  return initiallyAuthenticated ? (
    <Dashboard adminEmail={adminEmail} sessionExpiresAt={sessionExpiresAt} />
  ) : (
    <AuthPanel adminEmail={adminEmail} />
  );
}
