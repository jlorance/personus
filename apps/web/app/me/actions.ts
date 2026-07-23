'use server';

import { createPersona, deletePersona } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

export async function createPersonaAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!displayName) return;
  await createPersona(principal, {
    displayName,
    headline: String(formData.get('headline') ?? '').trim() || undefined,
    visibility: String(formData.get('visibility') ?? 'community'),
  });
  revalidatePath('/me');
}

export async function deletePersonaAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const uri = String(formData.get('uri') ?? '');
  if (uri) await deletePersona(principal, uri);
  revalidatePath('/me');
}
