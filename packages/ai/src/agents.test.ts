/**
 * Agent configuration tests — verify that every agent has a `maxSteps` ceiling
 * configured so an authenticated user cannot drive an unbounded loop.
 *
 * These are pure unit tests: no database, no LLM call. The agents are module-level
 * singletons; `getDefaultGenerateOptionsLegacy()` returns the stored options object
 * directly (without hitting the model) when the options are not a function.
 */

import { describe, expect, it } from 'vitest';
import { discoveryAgent, personaCoachAgent, recommenderAgent } from './index';

describe('agent cost ceilings', () => {
  it('personaCoachAgent has maxSteps set on generate options', () => {
    const opts = personaCoachAgent.getDefaultGenerateOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });

  it('discoveryAgent has maxSteps set on generate options', () => {
    const opts = discoveryAgent.getDefaultGenerateOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });

  it('recommenderAgent has maxSteps set on generate options', () => {
    const opts = recommenderAgent.getDefaultGenerateOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });

  it('personaCoachAgent has maxSteps set on stream options', () => {
    const opts = personaCoachAgent.getDefaultStreamOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });

  it('discoveryAgent has maxSteps set on stream options', () => {
    const opts = discoveryAgent.getDefaultStreamOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });

  it('recommenderAgent has maxSteps set on stream options', () => {
    const opts = recommenderAgent.getDefaultStreamOptionsLegacy();
    expect((opts as Record<string, unknown>).maxSteps).toBeGreaterThan(0);
  });
});
