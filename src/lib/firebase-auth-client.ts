'use client';

import { getAuth } from 'firebase/auth';

import { app, isFirebaseConfigured } from '@/lib/firebase';

export function getFirebaseAuth() {
  return getAuth(app);
}

export { isFirebaseConfigured };
