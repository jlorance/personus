/**
 * Persona completeness scoring — a 0-100 signal used for browse ranking and to
 * guide the Persona Coach conversation. Weighted across the dimensions the
 * coach collects.
 */

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
  weight: number;
  get: (p: PersonaLike) => unknown;
}> = [
  { key: 'headline', label: 'Headline', weight: 15, get: (p) => p.headline },
  { key: 'skills', label: 'Skills', weight: 20, get: (p) => traitsOf(p).skills },
  { key: 'qualities', label: 'Qualities', weight: 15, get: (p) => traitsOf(p).qualities },
  { key: 'values', label: 'Values', weight: 10, get: (p) => traitsOf(p).values },
  {
    key: 'seekingOpportunities',
    label: 'Seeking',
    weight: 10,
    get: (p) => traitsOf(p).seekingOpportunities,
  },
  { key: 'offerings', label: 'Offerings', weight: 15, get: (p) => traitsOf(p).offerings },
  { key: 'focusAreas', label: 'Focus Areas', weight: 15, get: (p) => traitsOf(p).focusAreas },
];

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function calculateCompleteness(persona: PersonaLike): {
  score: number;
  breakdown: Record<string, boolean>;
  nextSuggestions: string[];
} {
  const breakdown: Record<string, boolean> = {};
  const nextSuggestions: string[] = [];
  let score = 0;
  for (const d of DIMENSIONS) {
    const filled = hasValue(d.get(persona));
    breakdown[d.key] = filled;
    if (filled) score += d.weight;
    else nextSuggestions.push(d.label);
  }
  return { score, breakdown, nextSuggestions };
}
