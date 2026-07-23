/**
 * Shared domain enums (inherited from the prior Personus data model).
 *
 * Declared as `as const` tuples so both the runtime array and the string-literal
 * union type derive from one source. Schema columns store these as `text`; these
 * constants are the canonical set of allowed values.
 */

export const ENTITY_TYPES = ['person', 'organization'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const VISIBILITY_LEVELS = ['public', 'authenticated', 'community', 'private'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const TRAIT_CATEGORIES = [
  'foundations',
  'capabilities',
  'direction',
  'offerings',
  'commerce',
] as const;
export type TraitCategory = (typeof TRAIT_CATEGORIES)[number];

export const RELATIONSHIP_TYPES = [
  'colleague',
  'client',
  'mentor',
  'friend',
  'community_member',
  'other',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const ENDORSEMENT_STRENGTHS = ['strong', 'moderate', 'light'] as const;
export type EndorsementStrength = (typeof ENDORSEMENT_STRENGTHS)[number];

export const CONTACT_REQUEST_STATUSES = ['pending', 'approved', 'declined'] as const;
export type ContactRequestStatus = (typeof CONTACT_REQUEST_STATUSES)[number];

export const COMMUNITY_MEMBER_ROLES = ['member', 'steward', 'admin'] as const;
export type CommunityMemberRole = (typeof COMMUNITY_MEMBER_ROLES)[number];

export const JOIN_POLICIES = ['open', 'approval', 'invite_only'] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];

export const PRIVACY_TIERS = ['public', 'selective', 'gated', 'sensitive', 'agent_local'] as const;
export type PrivacyTier = (typeof PRIVACY_TIERS)[number];

/**
 * Channel concepts are DELIBERATELY namespaced to avoid the old triple-overload
 * of the word "channel". Each lives in its own package; these enums name the
 * transports/platforms each one supports.
 */

/** PlatformChannels — Mastra `channels` primitive targets (bot surfaces). */
export const PLATFORM_CHANNELS = ['slack', 'discord', 'telegram'] as const;
export type PlatformChannel = (typeof PLATFORM_CHANNELS)[number];

/** ContactRelay — privacy-mediated contact delivery modes. */
export const CONTACT_RELAY_MODES = ['in_app', 'email_relay', 'signal'] as const;
export type ContactRelayMode = (typeof CONTACT_RELAY_MODES)[number];

/** NotificationTransport — ordinary UX notification delivery. */
export const NOTIFICATION_TRANSPORTS = ['in_app', 'email', 'digest'] as const;
export type NotificationTransport = (typeof NOTIFICATION_TRANSPORTS)[number];
