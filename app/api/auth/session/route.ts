import { NextResponse } from 'next/server';

import {
  DATA_COVENANT_VERSION,
  consentForUser,
  getUserSessionFromRequest,
  googleConfigured,
} from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getUserSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        googleConfigured: googleConfigured(),
        covenantVersion: DATA_COVENANT_VERSION,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const [ownerConsent, buyerConsent] = await Promise.all([
    consentForUser(session.userId, 'owner'),
    consentForUser(session.userId, 'buyer'),
  ]);
  return NextResponse.json(
    {
      authenticated: true,
      googleConfigured: googleConfigured(),
      covenantVersion: DATA_COVENANT_VERSION,
      user: {
        email: session.email,
        displayName: session.displayName,
        pictureUrl: session.pictureUrl,
        provider: session.authProvider,
      },
      consent: { owner: ownerConsent, buyer: buyerConsent },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
