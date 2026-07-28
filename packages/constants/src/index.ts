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

// 'steward' was declared but never assigned, gated, or tested — removed to avoid
// implying a permission tier that doesn't exist. Re-add with a real CASL rule +
// DB constraint when a steward role is actually designed.
export const COMMUNITY_MEMBER_ROLES = ['member', 'admin'] as const;
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

/**
 * Search & pagination limits. Named here so the shared ceiling isn't duplicated
 * across the service layer and the REST/UI callers, and so the intentional
 * per-surface default divergence is explicit rather than a bare literal.
 */
/** Service-layer default when a caller omits `maxResults`. */
export const DEFAULT_SEARCH_RESULTS = 3;
/** Hard ceiling on any single search request. */
export const MAX_SEARCH_RESULTS = 25;
/** REST discovery default (deliberately a touch higher than the agent default). */
export const DISCOVERY_DEFAULT_RESULTS = 5;
/** Explore page result count (semantic + text-fallback). */
export const EXPLORE_PAGE_SIZE = 12;
/** Max accepted length of a free-text search query string. */
export const MAX_QUERY_LENGTH = 200;
/** Max anonymous community list size. */
export const MAX_COMMUNITY_LIST = 50;

/**
 * Public-endpoint rate limiting.
 *
 * Both `/api/discover` and `/api/mcp` (tools/call) are anonymous paths that
 * fire expensive backend operations (OpenAI embedding + pgvector scan).
 * These ceilings bound budget exhaustion to an acceptable burst before any
 * per-user billing or auth exists. Window is shared across both surfaces.
 */
/** Sliding-window duration for public-endpoint rate limits (milliseconds). */
export const RATE_LIMIT_WINDOW_MS = 60_000;
/**
 * Max requests to GET /api/discover per window per IP.
 * Each request fires an OpenAI embedText() call — keep this conservative.
 */
export const RATE_LIMIT_DISCOVER_MAX = 30;
/**
 * Max requests to POST /api/mcp tools/call per window per IP.
 * pgvector scan only (no embedding); slightly more generous than discover.
 */
export const RATE_LIMIT_MCP_TOOLS_MAX = 60;

/** Maximum agentic steps any single Mastra agent session may take. */
export const AGENT_MAX_STEPS = 20;
