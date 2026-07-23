import { describe, expect, it } from 'vitest';
import { TimeoutError, withTimeout } from './index';

describe('withTimeout', () => {
  it('resolves when the promise beats the timeout', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 'fast')).resolves.toBe(42);
  });

  it('rejects with TimeoutError when the timeout wins', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 50));
    await expect(withTimeout(slow, 5, 'slow')).rejects.toBeInstanceOf(TimeoutError);
  });
});
