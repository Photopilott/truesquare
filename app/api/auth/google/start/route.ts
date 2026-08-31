import { NextResponse } from 'next/server';

import {
  GOOGLE_OAUTH_COOKIE,
  googleConfigured,
  googleRedirectUri,
  googleOAuthCookieOptions,
  pkceChallenge,
  randomToken,
  safeReturnTo,
  signGoogleOAuthState,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured yet.' },
      { status: 503 },
    );
  }
  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'));
  const state = randomToken(24);
  const verifier = randomToken(48);
  const nonce = randomToken(24);
  const redirectUri = googleRedirectUri();
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authorization.searchParams.set('redirect_uri', redirectUri);
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('scope', 'openid email profile');
  authorization.searchParams.set('state', state);
  authorization.searchParams.set('nonce', nonce);
  authorization.searchParams.set('code_challenge', pkceChallenge(verifier));
  authorization.searchParams.set('code_challenge_method', 'S256');
  authorization.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(authorization);
  response.cookies.set(
    GOOGLE_OAUTH_COOKIE,
    signGoogleOAuthState({
      state,
      verifier,
      nonce,
      returnTo,
      expiresAt: Date.now() + 10 * 60_000,
    }),
    googleOAuthCookieOptions(),
  );
  return response;
}
