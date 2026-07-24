/**
 * Persona completeness scoring — a 0-100 signal used for browse ranking and to
 * guide the Persona Coach conversation. Weighted across the dimensions the
 * coach collects.
 *
 * Dimension weights are admin-tunable at runtime via the `ai.completeness_weights`
 * system setting; the map below is the fail-closed default (and the seeded value).
 */

import { getSetting } from '@personus/db/settings';

interface PersonaLike {
  headline?: string | null;
  location?: string | null;
  traits?: unknown;
}

/** JSONB `traits` columns infer as `unknown`; normalize to a record for reads. */
function traitsOf(p: PersonaLike): Record<string, unknown> {
  return (p.traits ?? {}) as Record<string, unknown>;
}

const DIMENSIONS: Array<{
  key: string;
  label: string;
  get: (p: PersonaLike) => unknown;
}> = [
  { key: 'headline', label: 'Headline', get: (p) => p.headline },
  { key: 'skills', label: 'Skills', get: (p) => traitsOf(p).skills },
  { key: 'qualities', label: 'Qualities', get: (p) => traitsOf(p).qualities },
  { key: 'values', label: 'Values', get: (p) => traitsOf(p).values },
  { key: 'seekingOpportunities', label: 'Seeking', get: (p) => traitsOf(p).seekingOpportunities },
  { key: 'offerings', label: 'Offerings', get: (p) => traitsOf(p).offerings },
  { key: 'focusAreas', label: 'Focus Areas', get: (p) => traitsOf(p).focusAreas },
];

/** Fail-closed default weights (also the seeded `ai.completeness_weights` value). */
export const DEFAULT_COMPLETENESS_WEIGHTS: Record<string, number> = {
  headline: 15,
  skills: 20,
  qualities: 15,
  values: 10,
  seekingOpportunities: 10,
  offerings: 15,
  focusAreas: 15,
};

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export async function calculateCompleteness(persona: PersonaLike): Promise<{
  score: number;
  breakdown: Record<string, boolean>;
  nextSuggestions: string[];
}> {
  const weights = await getSetting<Record<string, number>>(
    'ai.completeness_weights',
    DEFAULT_COMPLETENESS_WEIGHTS,
  );
  const breakdown: Record<string, boolean> = {};
  const nextSuggestions: string[] = [];
  let score = 0;
  for (const d of DIMENSIONS) {
    const filled = hasValue(d.get(persona));
    breakdown[d.key] = filled;
    if (filled) score += weights[d.key] ?? DEFAULT_COMPLETENESS_WEIGHTS[d.key] ?? 0;
    else nextSuggestions.push(d.label);
  }
  return { score, breakdown, nextSuggestions };
}
