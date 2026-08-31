import { NextResponse } from 'next/server';

import { getSql } from '@/db';
import {
  getUserSessionFromRequest,
  isSameOriginUserRequest,
  USER_SESSION_COOKIE,
  userSessionCookieOptions,
} from '@/lib/user-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginUserRequest(request)) {
    return NextResponse.json(
      { error: 'Invalid request origin.' },
      { status: 403 },
    );
  }
  const session = await getUserSessionFromRequest(request);
  if (session) {
    const sql = getSql();
    await sql`UPDATE user_sessions SET revoked_at = NOW() WHERE id = ${session.sessionId}`;
  }
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(USER_SESSION_COOKIE, '', {
    ...userSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
