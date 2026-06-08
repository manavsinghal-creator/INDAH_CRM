import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth-config';
import { getAuthorizedUserFromToken } from '@/lib/auth-server';

const SessionSchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = SessionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 400 });
  }

  const user = await getAuthorizedUserFromToken(parsed.data.idToken);
  if (!user) {
    return NextResponse.json(
      { error: 'This Google account has not been approved for CRM access.' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, parsed.data.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
