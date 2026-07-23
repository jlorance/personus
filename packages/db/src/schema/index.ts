/**
 * Personus database schema — barrel re-export.
 *
 * Inherited from the prior data model, with one deliberate change: the old
 * `integrations` table is replaced by `platform_channel_bindings` (see the
 * PlatformChannels rethink in platform-channels.ts).
 */

export * from './_factory';
export * from './activity-events';
export * from './audit-log';
export * from './coach-sessions';
export * from './communities';
export * from './community-types';
export * from './contact-requests';
export * from './endorsements';
export * from './guilds';
export * from './personas';
export * from './platform-channels';
export * from './query-logs';
export * from './rate-limit-buckets';
export * from './shadow-personas';
export * from './system-settings';
export * from './traits';
export * from './users';
