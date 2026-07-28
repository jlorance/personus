'use server';

import {
  createCommunityType,
  deleteCommunityType,
  updateCommunityType,
} from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function createCommunityTypeAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const slug = String(formData.get('slug') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || undefined;
  if (!slug || !name) return;
  await createCommunityType(principal, { slug, name, description });
  revalidatePath('/community-types');
}

export async function updateCommunityTypeAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!rawId || !name) return;
  await updateCommunityType(principal, BigInt(rawId), { name });
  revalidatePath('/community-types');
}

export async function deleteCommunityTypeAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  if (!rawId) return;
  await deleteCommunityType(principal, BigInt(rawId));
  revalidatePath('/community-types');
}

export async function toggleCommunityTypeAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const rawId = String(formData.get('id') ?? '');
  const isActive = formData.get('isActive') === 'true';
  if (!rawId) return;
  await updateCommunityType(principal, BigInt(rawId), { isActive });
  revalidatePath('/community-types');
}
