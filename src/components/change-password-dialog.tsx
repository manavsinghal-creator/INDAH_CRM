'use client';

import * as React from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut as firebaseSignOut,
  updatePassword,
} from 'firebase/auth';
import { KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth } from '@/lib/firebase-auth-client';

interface ChangePasswordDialogProps {
  email: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function getPasswordErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
    return 'Your current password is incorrect.';
  }
  if (message.includes('auth/weak-password')) {
    return 'Choose a stronger password with at least 8 characters.';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('auth/requires-recent-login')) {
    return 'Please sign out, sign in again, and then change your password.';
  }
  if (message.includes('auth/network-request-failed')) {
    return 'Could not reach Firebase. Check your connection and try again.';
  }

  return message || 'The password could not be changed. Please try again.';
}

export function ChangePasswordDialog({
  email,
  isOpen,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSaving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSaving(false);
    }
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Your new password must be different from your current password.');
      return;
    }

    setSaving(true);

    try {
      const auth = getFirebaseAuth();
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Your login session has expired. Please sign in again.');
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await Promise.allSettled([
        firebaseSignOut(auth),
        fetch('/api/auth/session', { method: 'DELETE' }),
      ]);
      onOpenChange(false);
      router.replace('/login?passwordChanged=1');
      router.refresh();
    } catch (changePasswordError) {
      setError(getPasswordErrorMessage(changePasswordError));
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update the password for {email}. You will be signed out after it changes.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSaving}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSaving}
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Change Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
