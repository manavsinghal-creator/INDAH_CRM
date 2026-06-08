import 'server-only';

import { cookies } from 'next/headers';

import {
  isPrimaryAdmin,
  normalizeEmail,
  SESSION_COOKIE_NAME,
} from '@/lib/auth-config';

export type SessionUser = {
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'collaborator';
};

type FirebaseAccount = {
  email?: string;
  displayName?: string;
  photoUrl?: string;
};

function firebaseApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Firebase authentication is not configured.');
  return apiKey;
}

function firebaseProjectId() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project ID is not configured.');
  return projectId;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseAccount | null> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      cache: 'no-store',
    },
  );

  if (!response.ok) return null;
  const payload = await response.json();
  return payload.users?.[0] || null;
}

async function authorizedUserDocument(email: string, idToken: string) {
  const documentId = encodeURIComponent(normalizeEmail(email));
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents/authorizedUsers/${documentId}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    },
  );

  if (!response.ok) return null;
  return response.json();
}

export async function getAuthorizedUserFromToken(idToken: string): Promise<SessionUser | null> {
  const account = await verifyFirebaseIdToken(idToken);
  if (!account?.email) return null;

  const email = normalizeEmail(account.email);
  if (isPrimaryAdmin(email)) {
    return {
      email,
      name: account.displayName || 'Admin',
      picture: account.photoUrl,
      role: 'admin',
    };
  }

  const document = await authorizedUserDocument(email, idToken);
  if (!document) return null;

  return {
    email,
    name: account.displayName || email,
    picture: account.photoUrl,
    role: document.fields?.role?.stringValue === 'admin' ? 'admin' : 'collaborator',
  };
}

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value || null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const idToken = await getSessionToken();
  if (!idToken) return null;

  try {
    return await getAuthorizedUserFromToken(idToken);
  } catch {
    return null;
  }
}

export async function requireAuthorizedUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireAdmin() {
  const user = await requireAuthorizedUser();
  if (user.role !== 'admin') throw new Error('Admin access required');
  return user;
}

export async function firestoreRequest(path: string, init: RequestInit = {}) {
  const idToken = await getSessionToken();
  if (!idToken) throw new Error('Unauthorized');

  return fetch(
    `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    },
  );
}
