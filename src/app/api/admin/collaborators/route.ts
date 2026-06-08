import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isPrimaryAdmin, normalizeEmail, PRIMARY_ADMIN_EMAIL } from '@/lib/auth-config';
import { firestoreRequest, requireAdmin } from '@/lib/auth-server';

const CollaboratorSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'collaborator']).default('collaborator'),
});

function collaboratorFromDocument(document: any) {
  return {
    email: document.fields?.email?.stringValue || document.name?.split('/').pop(),
    role: document.fields?.role?.stringValue || 'collaborator',
    addedAt: document.fields?.addedAt?.timestampValue || null,
  };
}

export async function GET() {
  await requireAdmin();
  const response = await firestoreRequest('authorizedUsers?pageSize=100');
  const data = response.ok ? await response.json() : { documents: [] };

  return NextResponse.json({
    collaborators: [
      { email: PRIMARY_ADMIN_EMAIL, role: 'admin', addedAt: null, primary: true },
      ...(data.documents || [])
        .map(collaboratorFromDocument)
        .filter((user: { email: string }) => !isPrimaryAdmin(user.email)),
    ],
  });
}

export async function POST(request: Request) {
  await requireAdmin();
  const parsed = CollaboratorSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (isPrimaryAdmin(email)) {
    return NextResponse.json({ error: 'The primary admin already has access.' }, { status: 409 });
  }

  const response = await firestoreRequest(
    `authorizedUsers/${encodeURIComponent(email)}?updateMask.fieldPaths=email&updateMask.fieldPaths=role&updateMask.fieldPaths=addedAt`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          role: { stringValue: parsed.data.role },
          addedAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Could not save collaborator. Check the Firestore security rules.' },
      { status: response.status },
    );
  }

  return NextResponse.json({ collaborator: collaboratorFromDocument(await response.json()) });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const email = normalizeEmail(new URL(request.url).searchParams.get('email') || '');
  if (!email || isPrimaryAdmin(email)) {
    return NextResponse.json({ error: 'The primary admin cannot be removed.' }, { status: 400 });
  }

  const response = await firestoreRequest(`authorizedUsers/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    return NextResponse.json({ error: 'Could not remove collaborator.' }, { status: response.status });
  }

  return NextResponse.json({ success: true });
}
