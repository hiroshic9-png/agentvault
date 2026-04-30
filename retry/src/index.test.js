import { describe, it } from 'node:test';
import assert from 'node:assert';
import { withRetry, withTimeout, resilient } from './index.js';

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const result = await withRetry(() => Promise.resolve('ok'));
    assert.strictEqual(result, 'ok');
  });

  it('should retry on failure and eventually succeed', async () => {
    let attempts = 0;
    const result = await withRetry(() => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return Promise.resolve('recovered');
    }, { retries: 3, baseDelayMs: 10 });
    assert.strictEqual(result, 'recovered');
    assert.strictEqual(attempts, 3);
  });

  it('should throw after exhausting retries', async () => {
    await assert.rejects(
      () => withRetry(() => { throw new Error('permanent'); }, { retries: 2, baseDelayMs: 10 }),
      { message: 'permanent' }
    );
  });

  it('should respect shouldRetry', async () => {
    let attempts = 0;
    await assert.rejects(
      () => withRetry(() => {
        attempts++;
        throw new Error('no-retry');
      }, { retries: 5, baseDelayMs: 10, shouldRetry: () => false }),
      { message: 'no-retry' }
    );
    assert.strictEqual(attempts, 1);
  });

  it('should call onRetry callback', async () => {
    let retryCount = 0;
    let attempts = 0;
    await withRetry(() => {
      attempts++;
      if (attempts < 2) throw new Error('retry-me');
      return 'ok';
    }, {
      retries: 3,
      baseDelayMs: 10,
      onRetry: () => { retryCount++; },
    });
    assert.strictEqual(retryCount, 1);
  });
});

describe('withTimeout', () => {
  it('should resolve before timeout', async () => {
    const result = await withTimeout(() => Promise.resolve('fast'), 1000);
    assert.strictEqual(result, 'fast');
  });

  it('should reject on timeout', async () => {
    await assert.rejects(
      () => withTimeout(() => new Promise(r => setTimeout(r, 5000)), 50),
      (err) => {
        assert.strictEqual(err.code, 'AGENTVAULT_TIMEOUT');
        return true;
      }
    );
  });
});

describe('resilient', () => {
  it('should combine retry and timeout', async () => {
    let attempts = 0;
    const result = await resilient(() => {
      attempts++;
      if (attempts < 2) throw new Error('transient');
      return 'ok';
    }, { retries: 3, timeoutMs: 1000, baseDelayMs: 10 });
    assert.strictEqual(result, 'ok');
  });

  it('should use fallback on total failure', async () => {
    const result = await resilient(
      () => { throw new Error('dead'); },
      {
        retries: 1,
        timeoutMs: 1000,
        baseDelayMs: 10,
        fallback: (err) => `fallback: ${err.message}`,
      }
    );
    assert.strictEqual(result, 'fallback: dead');
  });

  it('should throw without fallback', async () => {
    await assert.rejects(
      () => resilient(() => { throw new Error('no-fallback'); }, { retries: 0, baseDelayMs: 10 }),
      { message: 'no-fallback' }
    );
  });
});
