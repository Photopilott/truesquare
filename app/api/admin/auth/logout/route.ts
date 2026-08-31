import { NextResponse } from 'next/server';

import { getSql } from '@/db';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionFromRequest,
  isSameOriginRequest,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const session = await getAdminSessionFromRequest(request);
  if (session) {
    const sql = getSql();
    await sql`UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ${session.id}`;
  }

  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
