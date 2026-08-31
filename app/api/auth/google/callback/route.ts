import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSql } from '@/db';
import {
  createUserSession,
  GOOGLE_OAUTH_COOKIE,
  googleOAuthCookieOptions,
  googleRedirectUri,
  normalizeUserEmail,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
  verifyGoogleOAuthState,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
};
type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function authRedirect(
  request: Request,
  returnTo: string,
  status: 'success' | 'error',
  message?: string,
) {
  const target = new URL(returnTo, request.url);
  target.searchParams.set('auth', status);
  if (message) target.searchParams.set('authError', message.slice(0, 160));
  return target;
}

function verifiedIdTokenClaims(idToken: string | undefined) {
  if (!idToken) return null;
  try {
    const [, payload] = idToken.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      aud?: string;
      iss?: string;
      nonce?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const stored = verifyGoogleOAuthState(
    cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value,
  );
  const state = requestUrl.searchParams.get('state');
  const code = requestUrl.searchParams.get('code');
  const returnTo = stored?.returnTo ?? '/';

  if (!stored || !state || state !== stored.state || !code) {
    const response = NextResponse.redirect(
      authRedirect(
        request,
        returnTo,
        'error',
        'Google sign-in could not be verified.',
      ),
    );
    response.cookies.set(GOOGLE_OAUTH_COOKIE, '', {
      ...googleOAuthCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
        code_verifier: stored.verifier,
      }),
    });
    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token || !tokens.id_token)
      throw new Error(tokens.error || 'Token exchange failed.');
    const claims = verifiedIdTokenClaims(tokens.id_token);
    if (
      !claims ||
      claims.aud !== process.env.GOOGLE_CLIENT_ID ||
      (claims.iss !== 'https://accounts.google.com' &&
        claims.iss !== 'accounts.google.com') ||
      claims.nonce !== stored.nonce ||
      !claims.exp ||
      claims.exp * 1000 <= Date.now()
    ) {
      throw new Error('Google returned an invalid identity token.');
    }

    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: 'no-store',
      },
    );
    const profile = (await profileResponse.json()) as GoogleUserInfo;
    const email = normalizeUserEmail(profile.email);
    if (
      !profileResponse.ok ||
      !profile.sub ||
      !email ||
      profile.email_verified !== true
    ) {
      throw new Error('Google did not return a verified email address.');
    }

    const sql = getSql();
    const conflicts = (await sql`
      SELECT id, email, google_subject
      FROM app_users
      WHERE google_subject = ${profile.sub} OR email = ${email}
    `) as Array<{ id: string; email: string; google_subject: string | null }>;
    const bySubject = conflicts.find(
      (user) => user.google_subject === profile.sub,
    );
    const byEmail = conflicts.find(
      (user) => normalizeUserEmail(user.email) === email,
    );
    if (bySubject && byEmail && bySubject.id !== byEmail.id) {
      throw new Error(
        'This Google account conflicts with an existing account.',
      );
    }
    if (byEmail?.google_subject && byEmail.google_subject !== profile.sub) {
      throw new Error(
        'This email is already linked to a different Google account.',
      );
    }

    const existingUser = bySubject ?? byEmail;
    const users = existingUser
      ? ((await sql`
        UPDATE app_users SET
          email = ${email},
          email_verified_at = NOW(),
          google_subject = ${profile.sub},
          display_name = ${profile.name ?? null},
          picture_url = ${profile.picture ?? null},
          last_auth_provider = 'google',
          last_login_at = NOW(),
          updated_at = NOW()
        WHERE id = ${existingUser.id}
        RETURNING id
      `) as Array<{ id: string }>)
      : ((await sql`
        INSERT INTO app_users (
          email, email_verified_at, google_subject, display_name, picture_url,
          last_auth_provider, last_login_at, updated_at
        ) VALUES (
          ${email}, NOW(), ${profile.sub}, ${profile.name ?? null}, ${profile.picture ?? null},
          'google', NOW(), NOW()
        )
        RETURNING id
      `) as Array<{ id: string }>);
    const token = await createUserSession(users[0].id, 'google');
    const response = NextResponse.redirect(
      authRedirect(request, returnTo, 'success'),
    );
    response.cookies.set(
      USER_SESSION_COOKIE,
      token,
      userSessionCookieOptions(),
    );
    response.cookies.set(GOOGLE_OAUTH_COOKIE, '', {
      ...googleOAuthCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('Google authentication failed.', error);
    const response = NextResponse.redirect(
      authRedirect(
        request,
        returnTo,
        'error',
        'Google sign-in failed. Use email OTP or try again.',
      ),
    );
    response.cookies.set(GOOGLE_OAUTH_COOKIE, '', {
      ...googleOAuthCookieOptions(),
      maxAge: 0,
    });
    return response;
  }
}
