/**
 * NotificationTransport — ordinary UX notification delivery (in_app / email /
 * digest). The third de-conflated "channel" concept, fully separate from
 * PlatformChannels (Mastra bots) and ContactRelay (private mediated contact).
 *
 * "Transport" is used deliberately instead of "channel" so the term is never
 * reused for two different ideas.
 */

import type { NotificationTransport as TransportName } from '@personus/constants';
import { logger } from '@personus/logger';

export interface Notification {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string;
}

export interface Transport {
  readonly name: TransportName;
  send(n: Notification): Promise<void>;
}

/** Default transport — in-app bell/inbox. */
export class InAppTransport implements Transport {
  readonly name = 'in_app' as const;
  async send(n: Notification): Promise<void> {
    logger.info({ userId: n.userId, type: n.type }, 'NotificationTransport(in_app): enqueued');
  }
}

const NOT_WIRED = (name: string) =>
  new Error(
    `NotificationTransport "${name}" not wired yet — implement in packages/notifications/src/index.ts`,
  );

/** Transactional email for high-priority events. */
export class EmailTransport implements Transport {
  readonly name = 'email' as const;
  async send(_n: Notification): Promise<void> {
    throw NOT_WIRED(this.name);
  }
}

/** Batched weekly digest. */
export class DigestTransport implements Transport {
  readonly name = 'digest' as const;
  async send(_n: Notification): Promise<void> {
    throw NOT_WIRED(this.name);
  }
}

export function getTransport(name?: TransportName): Transport {
  switch (name) {
    case 'email':
      return new EmailTransport();
    case 'digest':
      return new DigestTransport();
    default:
      return new InAppTransport();
  }
}
