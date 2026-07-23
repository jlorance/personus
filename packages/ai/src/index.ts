/**
 * Central Mastra instance for Personus. The founding pass registers a single
 * agent (Persona Coach); Recommender + Discovery agents plug in here later.
 * CopilotKit reaches these agents over AG-UI (see apps/web/app/api/copilotkit).
 */

import { Mastra } from '@mastra/core';
import { personaCoachAgent } from './agents/persona-coach';

export const mastra = new Mastra({
  agents: {
    'persona-coach': personaCoachAgent,
  },
});

export { personaCoachAgent };
export { buildChannelsConfig, resolvePlatformChannels } from './platform-channels';
export { buildAgentRequestContext, getToolPrincipal, PRINCIPAL_CTX_KEY } from './principal-context';
