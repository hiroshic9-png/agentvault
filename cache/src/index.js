/**
 * agentvault-cache — Smart Caching for MCP Tool Calls
 * 
 * MCP tool呼び出し結果のキャッシュ。同じ引数での重複呼び出しを排除し、
 * レイテンシとAPI消費を削減する。テレメトリ搭載（opt-in）。
 * 
 * Usage:
 *   import { createCache } from 'agentvault-cache';
 *   
 *   const cache = createCache({ ttlMs: 60000 }); // 1 minute TTL
 *   
 *   const result = await cache.wrap('search', { q: 'hello' }, () =>
 *     client.callTool({ name: 'search', arguments: { q: 'hello' }})
 *   );
 */

const TELEMETRY_ENDPOINT = process.env.AGENTVAULT_TELEMETRY_ENDPOINT || null;
let _sessionId = null;
let _buffer = [];

function getSessionId() {
  if (!_sessionId) {
    _sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return _sessionId;
}

async function recordTelemetry(event) {
  if (!TELEMETRY_ENDPOINT) return;
  _buffer.push({
    event_type: event.type,
    tool_name: event.toolName || null,
    source: 'cache',
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    cache_hit: event.cacheHit || false,
    cache_size: event.cacheSize || 0,
    ttl_ms: event.ttlMs || 0,
  });
  if (_buffer.length >= 10) await flushTelemetry();
}

async function flushTelemetry() {
  if (!TELEMETRY_ENDPOINT || _buffer.length === 0) return;
  const batch = [..._buffer];
  _buffer = [];
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch, source: 'cache', session_id: getSessionId() }),
    });
  } catch {}
}

/**
 * キャッシュキーの生成
 */
function makeKey(toolName, args) {
  return `${toolName}::${JSON.stringify(args, Object.keys(args || {}).sort())}`;
}

/**
 * createCache — MCPツール呼び出し結果のキャッシュ
 * 
 * @param {Object} options
 * @param {number} options.ttlMs - TTL (default: 300000 = 5 minutes)
 * @param {number} options.maxSize - 最大キャッシュエントリ数 (default: 100)
 * @param {Function} options.keyFn - カスタムキー生成関数 (optional)
 */
export function createCache(options = {}) {
  const {
    ttlMs = 300000,
    maxSize = 100,
    keyFn = makeKey,
  } = options;

  const store = new Map();
  let hits = 0;
  let misses = 0;

  /**
   * キャッシュの掃除（期限切れエントリを削除）
   */
  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.createdAt > entry.ttl) {
        store.delete(key);
      }
    }
  }

  /**
   * LRU的にサイズ制限を適用
   */
  function evictIfNeeded() {
    if (store.size <= maxSize) return;
    // 最も古いエントリを削除
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }

  return {
    /**
     * wrap — キャッシュありでfnを実行
     * 
     * @param {string} toolName - ツール名
     * @param {Object} args - ツール引数
     * @param {Function} fn - キャッシュミス時に実行する関数
     * @param {Object} opts - オプション（ttlMs でエントリ固有のTTLを指定可）
     */
    async wrap(toolName, args, fn, opts = {}) {
      const entryTtl = opts.ttlMs || ttlMs;
      const key = keyFn(toolName, args);
      
      // キャッシュヒット判定
      const cached = store.get(key);
      if (cached && (Date.now() - cached.createdAt < cached.ttl)) {
        hits++;
        await recordTelemetry({
          type: 'cache_hit',
          toolName,
          cacheHit: true,
          cacheSize: store.size,
          ttlMs: entryTtl,
        });
        return cached.value;
      }

      // キャッシュミス
      misses++;
      const result = await fn();
      
      store.set(key, {
        value: result,
        createdAt: Date.now(),
        ttl: entryTtl,
      });
      
      evictIfNeeded();
      
      await recordTelemetry({
        type: 'cache_miss',
        toolName,
        cacheHit: false,
        cacheSize: store.size,
        ttlMs: entryTtl,
      });

      return result;
    },

    /**
     * invalidate — 特定ツールのキャッシュを無効化
     */
    invalidate(toolName, args) {
      if (args !== undefined) {
        store.delete(keyFn(toolName, args));
      } else {
        // ツール名だけで部分一致削除
        for (const key of store.keys()) {
          if (key.startsWith(toolName + '::')) store.delete(key);
        }
      }
    },

    /**
     * clear — 全キャッシュクリア
     */
    clear() {
      store.clear();
      hits = 0;
      misses = 0;
    },

    /**
     * stats — キャッシュ統計
     */
    stats() {
      cleanup();
      const total = hits + misses;
      return {
        size: store.size,
        hits,
        misses,
        hit_rate: total > 0 ? Math.round(hits / total * 100) : 0,
      };
    },
  };
}

export { flushTelemetry };
export default { createCache, flushTelemetry };
