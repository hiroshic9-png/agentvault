import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createCache } from './index.js';

describe('createCache', () => {
  it('should cache results', async () => {
    const cache = createCache({ ttlMs: 10000 });
    let callCount = 0;
    
    const fn = async () => { callCount++; return 'result'; };
    
    const r1 = await cache.wrap('tool', { q: 'hello' }, fn);
    const r2 = await cache.wrap('tool', { q: 'hello' }, fn);
    
    assert.strictEqual(r1, 'result');
    assert.strictEqual(r2, 'result');
    assert.strictEqual(callCount, 1); // second call was cached
  });

  it('should not cache different args', async () => {
    const cache = createCache({ ttlMs: 10000 });
    let callCount = 0;
    
    const fn = async () => { callCount++; return `result-${callCount}`; };
    
    await cache.wrap('tool', { q: 'a' }, fn);
    await cache.wrap('tool', { q: 'b' }, fn);
    
    assert.strictEqual(callCount, 2);
  });

  it('should expire after TTL', async () => {
    const cache = createCache({ ttlMs: 50 });
    let callCount = 0;
    
    const fn = async () => { callCount++; return 'result'; };
    
    await cache.wrap('tool', { q: 'hello' }, fn);
    await new Promise(r => setTimeout(r, 100));
    await cache.wrap('tool', { q: 'hello' }, fn);
    
    assert.strictEqual(callCount, 2);
  });

  it('should respect maxSize', async () => {
    const cache = createCache({ ttlMs: 10000, maxSize: 2 });
    
    await cache.wrap('a', {}, async () => 'a');
    await cache.wrap('b', {}, async () => 'b');
    await cache.wrap('c', {}, async () => 'c');
    
    assert.strictEqual(cache.stats().size, 2);
  });

  it('should invalidate by tool name', async () => {
    const cache = createCache({ ttlMs: 10000 });
    let callCount = 0;
    
    const fn = async () => { callCount++; return 'result'; };
    
    await cache.wrap('tool', { q: 'hello' }, fn);
    cache.invalidate('tool');
    await cache.wrap('tool', { q: 'hello' }, fn);
    
    assert.strictEqual(callCount, 2);
  });

  it('should track stats', async () => {
    const cache = createCache({ ttlMs: 10000 });
    const fn = async () => 'result';
    
    await cache.wrap('tool', { q: 'hello' }, fn);
    await cache.wrap('tool', { q: 'hello' }, fn);
    await cache.wrap('tool', { q: 'world' }, fn);
    
    const stats = cache.stats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 2);
    assert.strictEqual(stats.hit_rate, 33);
    assert.strictEqual(stats.size, 2);
  });

  it('should clear all cache', async () => {
    const cache = createCache({ ttlMs: 10000 });
    
    await cache.wrap('a', {}, async () => 'a');
    await cache.wrap('b', {}, async () => 'b');
    cache.clear();
    
    assert.strictEqual(cache.stats().size, 0);
    assert.strictEqual(cache.stats().hits, 0);
  });

  it('should allow per-entry TTL', async () => {
    const cache = createCache({ ttlMs: 10000 });
    let callCount = 0;
    
    const fn = async () => { callCount++; return 'result'; };
    
    await cache.wrap('tool', { q: 'hello' }, fn, { ttlMs: 50 });
    await new Promise(r => setTimeout(r, 100));
    await cache.wrap('tool', { q: 'hello' }, fn);
    
    assert.strictEqual(callCount, 2);
  });
});
