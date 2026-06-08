'use client';

import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2, LogIn } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase-auth-client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setLoading] = useState(false);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isFirebaseConfigured) {
        throw new Error('Firebase environment variables have not been added yet.');
      }

      const result = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
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
      const message = signInError instanceof Error ? signInError.message : '';
      setError(
        message.includes('auth/invalid-credential')
          ? 'Incorrect email or password.'
          : message || 'Sign-in failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={signIn}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        Sign in
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </form>
  );
}
