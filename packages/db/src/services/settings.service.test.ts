import { describe, expect, it } from 'vitest';
import { coerceSettingValue } from './settings.service';

describe('coerceSettingValue', () => {
  it('coerces booleans from checkbox/string forms', () => {
    expect(coerceSettingValue('boolean', 'true')).toBe(true);
    expect(coerceSettingValue('boolean', 'on')).toBe(true);
    expect(coerceSettingValue('boolean', '1')).toBe(true);
    expect(coerceSettingValue('boolean', 'false')).toBe(false);
    expect(coerceSettingValue('boolean', '')).toBe(false);
  });
  it('coerces numbers', () => {
    expect(coerceSettingValue('number', '42')).toBe(42);
    expect(coerceSettingValue('number', '0.7')).toBe(0.7);
  });
  it('parses json, falling back to {} on invalid input', () => {
    expect(coerceSettingValue('json', '{"a":1}')).toEqual({ a: 1 });
    expect(coerceSettingValue('json', 'not json')).toEqual({});
  });
  it('passes strings through', () => {
    expect(coerceSettingValue('string', 'openai/gpt-4o')).toBe('openai/gpt-4o');
  });
});
