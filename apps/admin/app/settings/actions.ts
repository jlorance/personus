'use server';

import { coerceSettingValue, updateSystemSetting } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function updateSettingAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const key = String(formData.get('key') ?? '');
  const valueType = String(formData.get('valueType') ?? 'string');
  const raw = String(formData.get('value') ?? '');
  if (!key) return;
  await updateSystemSetting(principal, key, coerceSettingValue(valueType, raw));
  revalidatePath('/settings');
  revalidatePath('/flags');
}
