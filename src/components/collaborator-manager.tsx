'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Collaborator = {
  email: string;
  role: 'admin' | 'collaborator';
  primary?: boolean;
};

export function CollaboratorManager() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const { toast } = useToast();

  async function loadCollaborators() {
    const response = await fetch('/api/admin/collaborators');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load collaborators.');
    setCollaborators(data.collaborators);
  }

  useEffect(() => {
    loadCollaborators()
      .catch((error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, []);

  async function addCollaborator(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'collaborator' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not add collaborator.');
      setEmail('');
      await loadCollaborators();
      toast({ title: 'Access granted', description: `${data.collaborator.email} can now sign in.` });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not add collaborator.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeCollaborator(collaboratorEmail: string) {
    const response = await fetch(`/api/admin/collaborators?email=${encodeURIComponent(collaboratorEmail)}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' });
      return;
    }
    await loadCollaborators();
    toast({ title: 'Access removed', description: `${collaboratorEmail} can no longer sign in.` });
  }

  return (
    <div className="space-y-6">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={addCollaborator}>
        <Input
          type="email"
          placeholder="collaborator@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add collaborator
        </Button>
      </form>

      <div className="divide-y rounded-lg border">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading collaborators...</p>}
        {!isLoading && collaborators.map((collaborator) => (
          <div key={collaborator.email} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{collaborator.email}</p>
              <Badge variant="secondary" className="mt-1">{collaborator.role}</Badge>
            </div>
            {!collaborator.primary && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${collaborator.email}`}
                onClick={() => removeCollaborator(collaborator.email)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
