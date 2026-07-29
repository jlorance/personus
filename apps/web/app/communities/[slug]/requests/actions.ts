'use server';

import {
  approveJoinRequest,
  createInvitation,
  declineJoinRequest,
  ForbiddenError,
  NotFoundError,
} from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

/**
 * Approve a pending join request — community admin only.
 *
 * ForbiddenError and NotFoundError surface as a thrown error (the server action
 * boundary converts them to a 500 unless the caller uses `useFormState`). For
 * now they are re-thrown so the error is visible during development; a
 * production form wraps this in error state.
 */
export async function approveJoinRequestAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const requestPublicId = String(formData.get('requestPublicId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!requestPublicId || !slug) return;
  await approveJoinRequest(principal, requestPublicId);
  revalidatePath(`/communities/${slug}/requests`);
  revalidatePath(`/communities/${slug}/members`);
}

/**
 * Decline a pending join request — community admin only.
 */
export async function declineJoinRequestAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const requestPublicId = String(formData.get('requestPublicId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!requestPublicId || !slug) return;
  await declineJoinRequest(principal, requestPublicId);
  revalidatePath(`/communities/${slug}/requests`);
}

/**
 * Create an invitation token for an invite_only community — admin only.
 *
 * Mints the token and persists it; the page re-fetches unclaimed invitations
 * after the action completes so the admin can see and copy the new token.
 * ForbiddenError (wrong policy or non-admin) and NotFoundError are swallowed
 * so the form does not surface a 500.
 */
export async function createInvitationAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!slug) return;
  try {
    await createInvitation(principal, slug);
    revalidatePath(`/communities/${slug}/requests`);
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError) return;
    throw err;
  }
}
