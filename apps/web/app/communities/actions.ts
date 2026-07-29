'use server';

import {
  claimInvitation,
  createCommunity,
  ForbiddenError,
  joinCommunity,
  leaveCommunity,
  requestToJoin,
} from '@personus/db/services';
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

/**
 * Submit a join request for an approval-gated community.
 *
 * ForbiddenError from the service (wrong join policy) is swallowed so that the
 * form does not surface a 500 — the caller should display the policy to the user
 * before offering this action. Returns the request publicId on success, null if
 * the community's policy does not accept requests.
 */
export async function requestToJoinAction(formData: FormData): Promise<string | null> {
  const principal = await requirePrincipal();
  const slug = String(formData.get('slug') ?? '').trim();
  const personaUri = String(formData.get('personaUri') ?? '').trim();
  if (!slug || !personaUri) return null;
  try {
    const id = await requestToJoin(principal, slug, personaUri);
    revalidatePath('/communities');
    return id;
  } catch (err) {
    if (err instanceof ForbiddenError) return null;
    throw err;
  }
}

/**
 * Claim an invitation token to join an invite_only community.
 *
 * ForbiddenError (expired / policy mismatch) is re-thrown so the caller can
 * surface a user-facing error; NotFoundError (bad token) likewise.
 */
export async function claimInvitationAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const token = String(formData.get('token') ?? '').trim();
  const personaUri = String(formData.get('personaUri') ?? '').trim();
  if (!token || !personaUri) return;
  await claimInvitation(principal, token, personaUri);
  revalidatePath('/communities');
}
