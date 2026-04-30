#!/usr/bin/env node
/**
 * Gateway 動作検証スクリプト
 * 
 * 1. Gateway のインスタンス生成を確認
 * 2. セキュリティフィルターの動作確認
 * 3. テレメトリ記録の動作確認
 * 4. 対象サーバー未設定時のエラーハンドリング確認
 */

import { AgentVaultGateway } from './index.js';
import { TelemetryCore } from './telemetry.js';
import { SecurityFilter } from './security.js';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const LOG_DIR = './test-logs';
let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

// === Test 1: Gateway インスタンス生成 ===
console.log('\n📋 Test 1: Gateway インスタンス生成');
const gw = new AgentVaultGateway({
  target: 'echo hello',
  telemetry: { enabled: true, logDir: LOG_DIR },
});
assert(gw.config.target === 'echo hello', 'target config set');
assert(gw.requestCount === 0, 'initial request count is 0');
assert(gw._targetClient === null, 'target client initially null');
assert(gw.telemetry instanceof TelemetryCore, 'telemetry is TelemetryCore instance');
assert(gw.security instanceof SecurityFilter, 'security is SecurityFilter instance');

// === Test 2: セキュリティフィルター ===
console.log('\n📋 Test 2: セキュリティフィルター');
const sec = new SecurityFilter({
  enabled: true,
  block_patterns: ['DROP', 'rm -rf'],
  max_requests_per_minute: 3,
});
assert(!sec.check('read_file', { path: '/tmp' }).blocked, 'safe call passes');
assert(sec.check('exec', { cmd: 'DROP TABLE users' }).blocked, 'DROP pattern blocked');
assert(sec.check('exec', { cmd: 'rm -rf /' }).blocked, 'rm -rf pattern blocked');
assert(sec.blockedCount === 2, 'blocked count = 2');

// Rate limiting
assert(!sec.isRateLimited(), 'not rate limited (1/3)');
assert(!sec.isRateLimited(), 'not rate limited (2/3)');
assert(!sec.isRateLimited(), 'not rate limited (3/3)');
assert(sec.isRateLimited(), 'rate limited (4/3)');

// === Test 3: テレメトリ記録 ===
console.log('\n📋 Test 3: テレメトリ記録');
const tel = new TelemetryCore({
  enabled: true,
  logDir: LOG_DIR,
  source: 'test',
});
const dp = tel.record({
  type: 'tool_call',
  toolName: 'read_file',
  inputSize: 100,
  outputSize: 500,
  latencyMs: 42,
});
assert(dp.id !== undefined, 'data point has id');
assert(dp.event_type === 'tool_call', 'event_type = tool_call');
assert(dp.tool_name === 'read_file', 'tool_name = read_file');
assert(dp.latency_ms === 42, 'latency_ms = 42');
assert(dp.source === 'test', 'source = test');

// ログファイル存在確認
const date = new Date().toISOString().split('T')[0];
const logFile = join(LOG_DIR, `test_${date}.jsonl`);
assert(existsSync(logFile), `log file exists: ${logFile}`);

const logContent = readFileSync(logFile, 'utf-8').trim();
const logEntry = JSON.parse(logContent);
assert(logEntry.tool_name === 'read_file', 'log entry has correct tool_name');

// === Test 4: getStatus ===
console.log('\n📋 Test 4: getStatus');
const status = gw.getStatus();
assert(status.status === 'running', 'status = running');
assert(status.target === 'echo hello', 'target in status');
assert(status.target_connected === false, 'target not yet connected');
assert(status.total_requests === 0, 'total_requests = 0');

// === Test 5: _forwardToTarget エラー（未設定） ===
console.log('\n📋 Test 5: target未設定時のエラー');
const gwNoTarget = new AgentVaultGateway({
  telemetry: { enabled: false },
});
try {
  await gwNoTarget._forwardToTarget('tools/list', {});
  assert(false, 'should throw error');
} catch (err) {
  assert(err.message.includes('No target'), 'correct error for missing target');
}

// === Cleanup ===
await tel.shutdown();
await gw.telemetry.shutdown();
try { rmSync(LOG_DIR, { recursive: true }); } catch {}

// === Summary ===
console.log(`\n${'='.repeat(40)}`);
console.log(`📊 結果: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}`);

process.exit(failed > 0 ? 1 : 0);
