'use client';

import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';

import { app, isFirebaseConfigured } from '@/lib/firebase';

let persistencePromise: Promise<void> | null = null;

export function getFirebaseAuth() {
  const auth = getAuth(app);
  if (typeof window !== 'undefined' && !persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      persistencePromise = null;
      console.error('Failed to enable Firebase auth persistence', error);
    });
  }
  return auth;
}

export async function getPersistentFirebaseAuth(): Promise<Auth> {
  const auth = getFirebaseAuth();
  await persistencePromise;
  return auth;
}

export { isFirebaseConfigured };
