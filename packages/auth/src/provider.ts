/**
 * AuthN provider seam — the vendor-neutral interface every auth backend
 * implements. Swap vendors with the `AUTH_PROVIDER` env var; nothing downstream
 * of this interface knows or cares which one is active.
 *
 * Deliberately vendor-neutral naming: `subjectId` (not `clerkUserId`) is the
 * external IdP subject identifier, stored on `users.auth_subject_id`.
 */

/** Normalized authenticated user, mapped from whatever the vendor returns. */
export interface AuthUser {
  subjectId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  /** Platform role claim (e.g. Clerk publicMetadata.role). Raw, un-parsed. */
  roleClaim?: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: 'admin' | 'member';
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Operations a concrete AuthN backend must provide. Request-context reads
 * (current session) are separated into ServerAuth so the two concerns stay
 * distinct.
 */
export interface AuthProvider {
  readonly name: string;
  getUserBySubjectId(subjectId: string): Promise<AuthUser | null>;
  getUserByEmail(email: string): Promise<AuthUser | null>;
  getUserOrganizations(subjectId: string): Promise<Organization[]>;
  verifyWebhook(payload: string, headers: Record<string, string>): WebhookEvent | null;
}

/** Server-side request-context reads — "who is the caller right now?". */
export interface ServerAuth {
  /** External subject id of the current session, or null if unauthenticated. */
  subjectId(): Promise<string | null>;
  /** Full normalized user for the current session, or null. */
  currentUser(): Promise<AuthUser | null>;
  /** True when the provider is configured (keys present) in this environment. */
  isConfigured(): boolean;
}
