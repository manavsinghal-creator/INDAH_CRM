import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_COOKIE_NAME,
  SESSION_REFRESH_MAX_AGE_SECONDS,
} from '@/lib/auth-config';
import { getAuthorizedUserFromToken } from '@/lib/auth-server';
import { db, isCrmDatabaseConfigured } from '@/lib/firebase';

const SessionSchema = z.object({
  idToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});

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

  if (isCrmDatabaseConfigured) {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userEmail: user.email,
        userName: user.name,
        action: 'signedIn',
        entityType: 'session',
        entityId: user.email,
        entityLabel: user.email,
        changes: [
          { field: 'role', before: '—', after: user.role },
          { field: 'sessionDuration', before: '—', after: parsed.data.refreshToken ? '30 days' : '50 minutes' },
        ],
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to record sign-in activity', error);
    }
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, parsed.data.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  if (parsed.data.refreshToken) {
    response.cookies.set(SESSION_REFRESH_COOKIE_NAME, parsed.data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_REFRESH_MAX_AGE_SECONDS,
    });
  }
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
  response.cookies.set(SESSION_REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
