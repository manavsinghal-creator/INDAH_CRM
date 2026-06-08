import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth-server';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to RealConnect</CardTitle>
          <CardDescription>
            Use an approved Google account to access the INDAH CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
