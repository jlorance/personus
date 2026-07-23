/**
 * Cross-cutting domain TypeScript interfaces (inherited).
 *
 * These describe the shape of the JSONB `traits` pool and related value objects
 * that ride inside schema columns. Table row types live in `@personus/db/schema`
 * (Drizzle `$inferSelect`); this package holds the hand-authored shapes.
 */

import type { ProficiencyLevel } from '@personus/constants';

export interface Skill {
  name: string;
  proficiency?: ProficiencyLevel;
}

export interface FocusArea {
  domain: string;
  description?: string;
  active?: boolean;
}

export interface Offering {
  type: string;
  description: string;
  availability?: string;
  audience?: string;
}

/**
 * The master trait pool shape. Personas denormalize a selected subset of this
 * into their own `traits` JSONB. All fields optional — a trait pool grows over
 * time through the Persona Coach conversation.
 */
export interface Traits {
  skills?: Skill[];
  qualities?: string[];
  experience?: string[];
  education?: string[];
  certifications?: string[];
  interests?: string[];
  values?: string[];
  seekingOpportunities?: string[];
  focusAreas?: FocusArea[];
  offerings?: Offering[];
  languages?: string[];
  [key: string]: unknown;
}

export interface ContactPreferences {
  openTo?: string[];
  preferredRelayMode?: 'in_app' | 'email_relay' | 'signal';
  autoDeclineReasons?: string[];
}

/** A binding of a Personus community to a Mastra PlatformChannel (bot surface). */
export interface PlatformChannelBinding {
  communityId: string;
  platform: 'slack' | 'discord' | 'telegram';
  externalRef: string;
  status: 'pending' | 'active' | 'revoked';
}
