'use server';

import { ForbiddenError, setMemberVisibility } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

/**
 * Toggle the caller's own directory visibility in a community.
 *
 * The action silently ignores ForbiddenError (non-member, unknown community)
 * so that submitting the form does not confirm membership or community
 * existence to someone who should not know — matching AC-4 of PER-28.
 */
export async function setMemberVisibilityAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const slug = String(formData.get('slug') ?? '').trim();
  const visible = formData.get('visible') === 'true';
  if (!slug) return;
  try {
    await setMemberVisibility(principal, slug, visible);
  } catch (err) {
    // ForbiddenError → non-member or unknown community. Swallow it: leaking the
    // distinction would undo the service's deliberate AC-4 uniform empty state.
    if (!(err instanceof ForbiddenError)) throw err;
  }
  revalidatePath(`/communities/${slug}/members`);
}
