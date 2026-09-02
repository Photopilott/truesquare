'use client';

import { useState } from 'react';
import { Bug, CheckCircle2, LoaderCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function BugReport() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submitBug() {
    const detail = message.trim();
    if (detail.length < 10) {
      setError(
        'Please add at least 10 characters so we can understand the bug.',
      );
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: detail,
          pagePath: window.location.pathname,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'The bug report could not be saved.');
      }
      setMessage('');
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'The bug report could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setSubmitted(false);
          setError('');
        }}
      >
        <Bug /> Report a bug
      </Button>
      {open && (
        <div className="mt-3 rounded-[10px] border border-border bg-secondary p-4">
          {submitted ? (
            <Alert className="border-[#A9DCB8] bg-accent">
              <CheckCircle2 />
              <AlertTitle>Bug report saved</AlertTitle>
              <AlertDescription>
                Thank you. It is now visible in the private admin dashboard.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Label htmlFor="owner-bug-report">What went wrong?</Label>
              <Textarea
                id="owner-bug-report"
                className="mt-2 min-h-28 bg-card"
                value={message}
                maxLength={2000}
                placeholder="Tell us what you expected and what happened."
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError('');
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {message.length}/2,000
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || message.trim().length < 10}
                  onClick={() => void submitBug()}
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : <Bug />}
                  Send bug report
                </Button>
              </div>
              {error && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
