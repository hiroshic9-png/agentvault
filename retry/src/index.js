/**
 * agentvault-retry — Resilient MCP Tool Calls
 * 
 * MCP tool呼び出しのリトライ・タイムアウト・フォールバックを提供する
 * 軽量ユーティリティ。テレメトリ搭載（opt-in）。
 * 
 * Usage:
 *   import { withRetry, withTimeout, resilient } from 'agentvault-retry';
 *   
 *   // Simple retry
 *   const result = await withRetry(() => client.callTool({ name: 'search', arguments: { q: 'hello' }}));
 *   
 *   // Full resilience: retry + timeout + fallback
 *   const result = await resilient(() => client.callTool(params), {
 *     retries: 3,
 *     timeoutMs: 5000,
 *     fallback: () => ({ content: [{ type: 'text', text: 'Service unavailable' }] }),
 *   });
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

/**
 * テレメトリ記録（opt-in: 環境変数が設定された場合のみ送信）
 */
async function recordTelemetry(event) {
  if (!TELEMETRY_ENDPOINT) return;

  _buffer.push({
    event_type: event.type,
    tool_name: event.toolName || null,
    source: 'retry',
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    latency_ms: event.latencyMs || 0,
    retry_count: event.retryCount || 0,
    success: event.success,
    error: event.error || null,
    timeout: event.timeout || false,
    used_fallback: event.usedFallback || false,
  });

  // バッファが10以上溜まったらフラッシュ
  if (_buffer.length >= 10) {
    await flushTelemetry();
  }
}

async function flushTelemetry() {
  if (!TELEMETRY_ENDPOINT || _buffer.length === 0) return;
  const batch = [..._buffer];
  _buffer = [];
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch, source: 'retry', session_id: getSessionId() }),
    });
  } catch {
    // テレメトリ送信失敗は静かに無視
  }
}

/**
 * sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * withRetry — 指数バックオフ付きリトライ
 * 
 * @param {Function} fn - リトライ対象の関数
 * @param {Object} options
 * @param {number} options.retries - 最大リトライ回数 (default: 3)
 * @param {number} options.baseDelayMs - 初回リトライ待機時間 (default: 1000)
 * @param {number} options.maxDelayMs - 最大待機時間 (default: 10000)
 * @param {Function} options.shouldRetry - リトライ判定関数 (default: always retry)
 * @param {Function} options.onRetry - リトライ時のコールバック
 */
export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = () => true,
    onRetry = null,
  } = options;

  let lastError;
  const start = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      
      await recordTelemetry({
        type: 'retry_success',
        retryCount: attempt,
        latencyMs: Date.now() - start,
        success: true,
      });
      
      return result;
    } catch (err) {
      lastError = err;
      
      if (attempt >= retries || !shouldRetry(err, attempt)) {
        await recordTelemetry({
          type: 'retry_exhausted',
          retryCount: attempt,
          latencyMs: Date.now() - start,
          success: false,
          error: err.message,
        });
        throw err;
      }

      // 指数バックオフ + ジッター
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
        maxDelayMs
      );

      if (onRetry) onRetry(err, attempt + 1, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * withTimeout — タイムアウト付き実行
 * 
 * @param {Function} fn - 実行する関数
 * @param {number} timeoutMs - タイムアウト (default: 30000)
 */
export async function withTimeout(fn, timeoutMs = 30000) {
  const start = Date.now();

  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`Operation timed out after ${timeoutMs}ms`);
        err.code = 'AGENTVAULT_TIMEOUT';
        
        recordTelemetry({
          type: 'timeout',
          latencyMs: timeoutMs,
          success: false,
          timeout: true,
          error: err.message,
        });
        
        reject(err);
      }, timeoutMs);
    }),
  ]);
}

/**
 * resilient — リトライ + タイムアウト + フォールバックの完全パッケージ
 * 
 * @param {Function} fn - 実行する関数
 * @param {Object} options
 * @param {number} options.retries - リトライ回数 (default: 3)
 * @param {number} options.timeoutMs - 1回あたりのタイムアウト (default: 10000)
 * @param {Function} options.fallback - フォールバック関数 (optional)
 * @param {number} options.baseDelayMs - バックオフ初期値 (default: 1000)
 * @param {Function} options.onRetry - リトライ時のコールバック
 */
export async function resilient(fn, options = {}) {
  const {
    retries = 3,
    timeoutMs = 10000,
    fallback = null,
    baseDelayMs = 1000,
    onRetry = null,
  } = options;

  try {
    return await withRetry(
      () => withTimeout(fn, timeoutMs),
      { retries, baseDelayMs, onRetry }
    );
  } catch (err) {
    if (fallback) {
      await recordTelemetry({
        type: 'fallback_used',
        success: false,
        usedFallback: true,
        error: err.message,
      });
      return await fallback(err);
    }
    throw err;
  }
}

/**
 * テレメトリバッファのフラッシュ（プロセス終了時に呼ぶ）
 */
export { flushTelemetry };

export default { withRetry, withTimeout, resilient, flushTelemetry };
