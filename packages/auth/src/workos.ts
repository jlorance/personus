/**
 * WorkOS implementation of the AuthN provider seam — STUB.
 *
 * Implementation guide (when enterprise SSO/SAML is needed):
 *   1. `bun add @workos-inc/node`.
 *   2. Implement each method against the WorkOS SDK, mapping WorkOS users/orgs
 *      to the normalized AuthUser/Organization shapes.
 *   3. `verifyWebhook` → WorkOS webhook signature verification.
 *   4. Add a `workosServerAuth: ServerAuth` reading the WorkOS session cookie.
 *   5. Set `AUTH_PROVIDER=workos`.
 * Because everything downstream depends only on the interface, no other code
 * changes are required.
 */

import type { AuthProvider, AuthUser, Organization, ServerAuth, WebhookEvent } from './provider';

const NOT_IMPLEMENTED = 'WorkOS provider not implemented yet — see packages/auth/src/workos.ts';

export class WorkOSProvider implements AuthProvider {
  readonly name = 'workos';
  async getUserBySubjectId(_subjectId: string): Promise<AuthUser | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getUserByEmail(_email: string): Promise<AuthUser | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getUserOrganizations(_subjectId: string): Promise<Organization[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  verifyWebhook(_payload: string, _headers: Record<string, string>): WebhookEvent | null {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export const workosServerAuth: ServerAuth = {
  isConfigured() {
    return false;
  },
  async subjectId() {
    return null;
  },
  async currentUser() {
    return null;
  },
};
