'use client';

import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Loader2, LogIn } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase-auth-client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(false);

  async function signIn() {
    setError('');
    setLoading(true);

    try {
      if (!isFirebaseConfigured) {
        throw new Error('Firebase environment variables have not been added yet.');
      }

      const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
      router.replace(searchParams.get('next') || '/');
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button className="w-full" size="lg" onClick={signIn} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        Continue with Google
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
