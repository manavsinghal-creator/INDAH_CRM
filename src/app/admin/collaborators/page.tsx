import { CollaboratorManager } from '@/components/collaborator-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireAdmin } from '@/lib/auth-server';

export default async function CollaboratorsPage() {
  await requireAdmin();

  return (
    <main className="container mx-auto max-w-3xl p-4 md:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Approved collaborators</CardTitle>
          <CardDescription>
            Only the Google accounts listed here can access the CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CollaboratorManager />
        </CardContent>
      </Card>
    </main>
  );
}
