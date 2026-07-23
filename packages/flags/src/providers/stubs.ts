/**
 * Vendor provider stubs. OpenFeature ships (or the vendor publishes) real SDKs
 * for these; wiring is intentionally deferred. To adopt one:
 *   - PostHog:      `bun add @openfeature/posthog-provider` and return it here.
 *   - LaunchDarkly: `bun add @launchdarkly/openfeature-server-provider` and return it.
 * Because everything reads through the OpenFeature client, no call sites change.
 */

import type { Provider } from '@openfeature/server-sdk';

export function createPostHogProvider(): Provider {
  throw new Error(
    'PostHog flags provider not wired yet — install @openfeature/posthog-provider and return it in packages/flags/src/providers/stubs.ts',
  );
}

export function createLaunchDarklyProvider(): Provider {
  throw new Error(
    'LaunchDarkly flags provider not wired yet — install @launchdarkly/openfeature-server-provider and return it in packages/flags/src/providers/stubs.ts',
  );
}
