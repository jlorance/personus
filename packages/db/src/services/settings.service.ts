/**
 * System settings admin service — read/update the `system_settings` rows behind
 * the admin control plane. Every operation is gated on the CASL `manage
 * AdminSurface` ability (admins only). Writes invalidate the per-key cache so
 * the change takes effect within one read.
 */

import { db } from '../index';
import { eq } from '../orm';
import { type SystemSetting, systemSettings } from '../schema/system-settings';
import { invalidateSetting } from '../settings-cache';
import { ForbiddenError, type ServicePrincipal } from './index';

/** List all settings (optionally by category). Admin only. */
export async function listSystemSettings(
  principal: ServicePrincipal,
  category?: string,
): Promise<SystemSetting[]> {
  if (!principal.ability.can('manage', 'AdminSurface')) throw new ForbiddenError();
  const rows = category
    ? await db.select().from(systemSettings).where(eq(systemSettings.category, category))
    : await db.select().from(systemSettings);
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Update a setting's value (admin only). The value's runtime type must match the
 * row's declared `valueType`; callers coerce strings/booleans/numbers before
 * passing them in.
 */
export async function updateSystemSetting(
  principal: ServicePrincipal,
  key: string,
  value: unknown,
): Promise<SystemSetting | null> {
  if (!principal.ability.can('manage', 'AdminSurface')) throw new ForbiddenError();
  const [updated] = await db
    .update(systemSettings)
    .set({
      value: value as SystemSetting['value'],
      updatedBy: principal.userId ? `user:${principal.userId}` : 'system',
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.key, key))
    .returning();
  if (updated) invalidateSetting(key);
  return updated ?? null;
}

/** Coerce a form string into the value shape for a given valueType. */
export function coerceSettingValue(valueType: string, raw: string): unknown {
  switch (valueType) {
    case 'boolean':
      return raw === 'true' || raw === 'on' || raw === '1';
    case 'number':
      return Number(raw);
    case 'json':
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    default:
      return raw;
  }
}
