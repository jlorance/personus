'use server';

import { revokePlatformChannel } from '@personus/db/services';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../lib/require-admin';

export async function revokeChannelAction(formData: FormData): Promise<void> {
  const principal = await requireAdmin();
  const publicId = String(formData.get('publicId') ?? '').trim();
  if (!publicId) return;
  await revokePlatformChannel(principal, publicId);
  revalidatePath('/platform-channels');
}
