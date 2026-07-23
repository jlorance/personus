'use server';

import { embedPersona } from '@personus/ai';
import { createPersona, deletePersona, updatePersonaEmbedding } from '@personus/db/services';
import { logger } from '@personus/logger';
import { createPersonaSchema } from '@personus/validations';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

export async function createPersonaAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  // Validate + normalize untrusted form input before it reaches the service.
  const parsed = createPersonaSchema.safeParse({
    displayName: String(formData.get('displayName') ?? '').trim(),
    headline: String(formData.get('headline') ?? '').trim() || undefined,
    visibility: String(formData.get('visibility') ?? 'community'),
  });
  if (!parsed.success) return;
  const persona = await createPersona(principal, parsed.data);

  // Best-effort semantic index — never block persona creation on embedding.
  try {
    const vec = await embedPersona(persona);
    if (vec) await updatePersonaEmbedding(principal, persona.uri, vec);
  } catch (err) {
    logger.warn({ err: String(err) }, 'persona embedding on create failed');
  }
  revalidatePath('/me');
}

export async function deletePersonaAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const uri = String(formData.get('uri') ?? '');
  if (uri) await deletePersona(principal, uri);
  revalidatePath('/me');
}
