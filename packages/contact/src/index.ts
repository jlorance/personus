/**
 * ContactRelay — privacy-mediated contact delivery (renamed from the old
 * `ContactChannelAdapter` to end the "channel" overload).
 *
 * THE gate: mediated introductions never expose raw contact details to the
 * requester. `contact_requests` stores no email/phone; the relay resolves the
 * recipient's channel preferences and delivers on their behalf. Every new
 * delivery mode is added as a ContactRelay implementation, never as a direct
 * integration at a call site.
 *
 * Modes (see CONTACT_RELAY_MODES): in_app (default), email_relay, signal.
 */

import type { ContactRelayMode } from '@personus/constants';
import { logger } from '@personus/logger';

/** A mediated introduction to deliver. Carries NO raw recipient contact info. */
export interface RelayMessage {
  contactRequestId: string;
  toPersonaUri: string;
  fromLabel: string;
  reason: string;
  message: string;
}

export interface RelayReceipt {
  mode: ContactRelayMode;
  delivered: boolean;
  reference?: string;
}

export interface ContactRelay {
  readonly mode: ContactRelayMode;
  deliver(msg: RelayMessage): Promise<RelayReceipt>;
}

/** Default relay — records an in-app delivery (surfaced in the recipient inbox). */
export class InAppRelay implements ContactRelay {
  readonly mode = 'in_app' as const;
  async deliver(msg: RelayMessage): Promise<RelayReceipt> {
    logger.info(
      { contactRequestId: msg.contactRequestId, toPersonaUri: msg.toPersonaUri },
      'ContactRelay(in_app): queued mediated introduction',
    );
    return { mode: this.mode, delivered: true, reference: `inapp:${msg.contactRequestId}` };
  }
}

const NOT_WIRED = (mode: string) =>
  new Error(`ContactRelay "${mode}" not wired yet — implement in packages/contact/src/index.ts`);

/** Pseudonymous email relay — recipient replies through a masked address. */
export class EmailRelay implements ContactRelay {
  readonly mode = 'email_relay' as const;
  async deliver(_msg: RelayMessage): Promise<RelayReceipt> {
    throw NOT_WIRED(this.mode);
  }
}

/** Signal-based privacy-first relay. */
export class SignalRelay implements ContactRelay {
  readonly mode = 'signal' as const;
  async deliver(_msg: RelayMessage): Promise<RelayReceipt> {
    throw NOT_WIRED(this.mode);
  }
}

/** Resolve a relay for the recipient's preferred mode (default in_app). */
export function getContactRelay(preferred?: ContactRelayMode): ContactRelay {
  switch (preferred) {
    case 'email_relay':
      return new EmailRelay();
    case 'signal':
      return new SignalRelay();
    default:
      return new InAppRelay();
  }
}
