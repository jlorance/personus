'use server';

import {
  createTraitMetadata,
  deleteTraitMetadata,
  updateTraitMetadata,
} from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function createTraitMetadataAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const key = String(formData.get('key') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const dataType = String(formData.get('dataType') ?? 'string').trim();
  if (!key || !displayName || !category) return;
  await createTraitMetadata(principal, {
    key,
    displayName,
    category,
    dataType,
    displayConfig: {},
    editConfig: {},
  });
  revalidatePath('/trait-metadata');
}

export async function updateTraitMetadataAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!rawId || !displayName) return;
  await updateTraitMetadata(principal, BigInt(rawId), { displayName });
  revalidatePath('/trait-metadata');
}

export async function deleteTraitMetadataAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  if (!rawId) return;
  await deleteTraitMetadata(principal, BigInt(rawId));
  revalidatePath('/trait-metadata');
}
