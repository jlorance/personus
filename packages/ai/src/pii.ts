/**
 * PII detection + redaction. Shared by the coach's advisory `check_pii` tool AND
 * the persona write path, so contact details can never be persisted into a
 * persona regardless of whether the model remembered to call the tool first.
 */

const PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: 'phone', regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
  { type: 'email', regex: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g },
  { type: 'ssn', regex: /\b\d{3}-?\d{2}-?\d{4}\b/g },
  { type: 'address', regex: /\b\d{1,5}\s+\w+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Ct)\b/gi },
];

export interface PIIResult {
  hasPII: boolean;
  detectedTypes: string[];
  redactedText: string;
}

/** Detect + redact PII in a single string. */
export function redactPII(text: string): PIIResult {
  const detected = new Set<string>();
  let redactedText = text;
  for (const { type, regex } of PATTERNS) {
    if (regex.test(redactedText)) {
      detected.add(type);
      redactedText = redactedText.replace(regex, '[REDACTED]');
    }
    regex.lastIndex = 0; // reset stateful global regex
  }
  return { hasPII: detected.size > 0, detectedTypes: [...detected], redactedText };
}

/** Recursively redact PII from any string leaf in a value (objects/arrays too). */
export function redactPIIDeep<T>(value: T): T {
  if (typeof value === 'string') return redactPII(value).redactedText as T;
  if (Array.isArray(value)) return value.map(redactPIIDeep) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactPIIDeep(v);
    return out as T;
  }
  return value;
}
