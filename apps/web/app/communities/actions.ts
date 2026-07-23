'use server';

import { createCommunity, joinCommunity, leaveCommunity } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

export async function createCommunityAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const name = String(formData.get('name') ?? '').trim();
  const foundingPersonaUri = String(formData.get('foundingPersonaUri') ?? '').trim();
  if (!name || !foundingPersonaUri) return;
  await createCommunity(principal, {
    name,
    foundingPersonaUri,
    communityType: String(formData.get('communityType') ?? 'club'),
    description: String(formData.get('description') ?? '').trim() || undefined,
  });
  revalidatePath('/communities');
}

export async function joinCommunityAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const slug = String(formData.get('slug') ?? '');
  const personaUri = String(formData.get('personaUri') ?? '');
  if (slug && personaUri) await joinCommunity(principal, slug, personaUri);
  revalidatePath('/communities');
}

export async function leaveCommunityAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const slug = String(formData.get('slug') ?? '');
  if (slug) await leaveCommunity(principal, slug);
  revalidatePath('/communities');
}
