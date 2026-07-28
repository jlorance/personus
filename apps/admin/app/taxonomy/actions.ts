'use server';

import {
  createTraitTaxonomy,
  deleteTraitTaxonomy,
  updateTraitTaxonomy,
} from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function createTaxonomyAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const traitKey = String(formData.get('traitKey') ?? '').trim();
  const taxonomySlug = String(formData.get('taxonomySlug') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const rawValues = String(formData.get('suggestedValues') ?? '').trim();
  if (!traitKey || !taxonomySlug || !displayName) return;
  const suggestedValues = rawValues
    ? rawValues
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  await createTraitTaxonomy(principal, { traitKey, taxonomySlug, displayName, suggestedValues });
  revalidatePath('/taxonomy');
}

export async function updateTaxonomyAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!rawId || !displayName) return;
  await updateTraitTaxonomy(principal, BigInt(rawId), { displayName });
  revalidatePath('/taxonomy');
}

export async function deleteTaxonomyAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  if (!rawId) return;
  await deleteTraitTaxonomy(principal, BigInt(rawId));
  revalidatePath('/taxonomy');
}
