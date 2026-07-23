/**
 * Clerk implementation of the AuthN provider seam (the working default).
 *
 * Clerk SDK calls are imported lazily inside methods so that merely importing
 * this module never crashes when Clerk env vars are absent — important for the
 * credential-free boot path (health route, local dev without keys).
 */

import type { AuthProvider, AuthUser, Organization, ServerAuth, WebhookEvent } from './provider';

function mapClerkUser(u: {
  id: string;
  primaryEmailAddress?: { emailAddress?: string } | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  publicMetadata?: { role?: unknown };
}): AuthUser {
  const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress ?? '';
  return {
    subjectId: u.id,
    email,
    firstName: u.firstName ?? undefined,
    lastName: u.lastName ?? undefined,
    imageUrl: u.imageUrl,
    roleClaim: u.publicMetadata?.role,
  };
}

export class ClerkProvider implements AuthProvider {
  readonly name = 'clerk';

  async getUserBySubjectId(subjectId: string): Promise<AuthUser | null> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(subjectId);
      return mapClerkUser(user as never);
    } catch {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    try {
      const client = await clerkClient();
      const list = await client.users.getUserList({ emailAddress: [email] });
      const user = list.data[0];
      return user ? mapClerkUser(user as never) : null;
    } catch {
      return null;
    }
  }

  async getUserOrganizations(subjectId: string): Promise<Organization[]> {
    const { clerkClient } = await import('@clerk/nextjs/server');
    try {
      const client = await clerkClient();
      const memberships = await client.users.getOrganizationMembershipList({ userId: subjectId });
      return memberships.data.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug ?? m.organization.id,
        role: m.role === 'org:admin' ? 'admin' : 'member',
      }));
    } catch {
      return [];
    }
  }

  verifyWebhook(payload: string, headers: Record<string, string>): WebhookEvent | null {
    // Svix-based verification is wired in the webhook route handler (later pass).
    // Kept on the interface so provider parity holds; returns null when unverified.
    void payload;
    void headers;
    return null;
  }
}

export const clerkServerAuth: ServerAuth = {
  isConfigured() {
    return Boolean(process.env.CLERK_SECRET_KEY);
  },
  async subjectId() {
    if (!this.isConfigured()) return null;
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      return userId ?? null;
    } catch {
      return null;
    }
  },
  async currentUser() {
    if (!this.isConfigured()) return null;
    try {
      const { currentUser } = await import('@clerk/nextjs/server');
      const u = await currentUser();
      return u ? mapClerkUser(u as never) : null;
    } catch {
      return null;
    }
  },
};
