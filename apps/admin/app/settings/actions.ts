'use server';

import { updateSystemSetting } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function updateSettingAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const key = String(formData.get('key') ?? '');
  const raw = String(formData.get('value') ?? '');
  if (!key) return;
  // The service coerces using the setting's OWN stored valueType — no client trust.
  await updateSystemSetting(principal, key, raw);
  revalidatePath('/settings');
  revalidatePath('/flags');
}
