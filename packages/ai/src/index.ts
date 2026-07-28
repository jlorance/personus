/**
 * Central Mastra instance for Personus. Registers the three agents — Persona
 * Coach (build a persona), Discovery (search trust networks), and Recommender
 * ("tell a friend" endorsements). CopilotKit reaches them over AG-UI (see
 * apps/web/app/api/copilotkit); the same agents/tools back the MCP endpoint.
 */

import { Mastra } from '@mastra/core';
import { discoveryAgent } from './agents/discovery';
import { personaCoachAgent } from './agents/persona-coach';
import { recommenderAgent } from './agents/recommender';

export const mastra = new Mastra({
  agents: {
    'persona-coach': personaCoachAgent,
    discovery: discoveryAgent,
    recommender: recommenderAgent,
  },
});

export { personaCoachAgent, discoveryAgent, recommenderAgent };
export {
  EMBEDDING_RELEVANT_FIELDS,
  embedPersona,
  embedText,
  personaEmbeddingText,
  refreshPersonaEmbedding,
} from './embeddings';
export {
  buildChannelsConfig,
  handlePlatformMessage,
  type InboundPlatformMessage,
  resolvePlatformChannels,
} from './platform-channels';
export { verifyPlatformSignature } from './platform-verify';
export {
  AGENT_IDS,
  type AgentId,
  agentRequestContexts,
  buildAgentRequestContext,
  contextWithPrincipal,
  getToolPrincipal,
  PRINCIPAL_CTX_KEY,
} from './principal-context';
