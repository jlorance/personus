'use server';

import { updateSystemSetting } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function toggleFlagAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const key = String(formData.get('key') ?? '');
  const next = String(formData.get('next') ?? '') === 'true';
  if (!key) return;
  await updateSystemSetting(principal, key, next);
  revalidatePath('/flags');
}
