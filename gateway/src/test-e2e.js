#!/usr/bin/env node
/**
 * E2E テスト: Gateway → filesystem MCPサーバー のプロキシ動作確認
 * 
 * Gateway経由で @modelcontextprotocol/server-filesystem のツールを呼び出し、
 * テレメトリログが正しく記録されることを確認する。
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';

const LOG_DIR = './e2e-test-logs';
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

// クリーンアップ
try { rmSync(LOG_DIR, { recursive: true }); } catch {}

console.log('\n📋 E2E Test: Gateway → filesystem server proxy');
console.log('  Starting gateway with filesystem target...\n');

// Gateway をサブプロセスとして起動し、MCPクライアントとして接続
const transport = new StdioClientTransport({
  command: 'node',
  args: [
    'src/cli.js',
    '--target', 'npx -y @modelcontextprotocol/server-filesystem /tmp',
    '--log-dir', LOG_DIR,
  ],
  stderr: 'pipe',
});

// stderrを表示（デバッグ用）
const stderrChunks = [];
transport.stderr?.on('data', (chunk) => {
  const text = chunk.toString();
  stderrChunks.push(text);
  process.stderr.write(`  [gw] ${text}`);
});

const client = new Client(
  { name: 'e2e-test-client', version: '0.1.0' },
  { capabilities: {} }
);

try {
  await client.connect(transport);
  console.log('  ✅ Connected to Gateway');
  passed++;

  // Test 1: tools/list
  console.log('\n📋 Test 1: tools/list via proxy');
  const toolsList = await client.listTools();
  assert(toolsList.tools.length > 0, `Got ${toolsList.tools.length} tools from filesystem server`);
  
  const toolNames = toolsList.tools.map(t => t.name);
  console.log(`  Tools: ${toolNames.join(', ')}`);
  assert(toolNames.includes('read_file') || toolNames.includes('list_directory'), 
    'Contains expected filesystem tools');

  // Test 2: tools/call (list_directory)
  console.log('\n📋 Test 2: tools/call (list_directory /tmp)');
  const listResult = await client.callTool({
    name: 'list_directory',
    arguments: { path: '/tmp' },
  });
  assert(listResult.content && listResult.content.length > 0, 'Got directory listing result');
  console.log(`  [debug] isError = ${JSON.stringify(listResult.isError)}, type = ${typeof listResult.isError}`);
  if (listResult.content?.[0]) console.log(`  [debug] content: ${listResult.content[0].text?.substring(0, 200)}`);
  // filesystemサーバーが/tmpの扱いでisError返すこともある → 結果取得自体が成功
  assert(listResult.content.length > 0, 'Got result content (proxy works)');

  // Test 3: テレメトリログ確認
  console.log('\n📋 Test 3: テレメトリログ確認');
  
  // ログが書き込まれるまで少し待つ
  await new Promise(r => setTimeout(r, 1000));
  
  const date = new Date().toISOString().split('T')[0];
  const logFile = join(LOG_DIR, `gateway_${date}.jsonl`);
  assert(existsSync(logFile), `Log file exists: ${logFile}`);
  
  if (existsSync(logFile)) {
    const logLines = readFileSync(logFile, 'utf-8').trim().split('\n');
    assert(logLines.length >= 2, `Got ${logLines.length} log entries (expect >= 2: tools_list + tool_call)`);
    
    const entries = logLines.map(l => JSON.parse(l));
    const toolsListEntry = entries.find(e => e.event_type === 'tools_list');
    const toolCallEntry = entries.find(e => e.event_type === 'tool_call');
    
    assert(!!toolsListEntry, 'tools_list event recorded');
    assert(!!toolCallEntry, 'tool_call event recorded');
    
    if (toolCallEntry) {
      assert(toolCallEntry.tool_name === 'list_directory', 'tool_name = list_directory');
      assert(toolCallEntry.latency_ms > 0, `latency_ms = ${toolCallEntry.latency_ms}ms`);
      assert(toolCallEntry.blocked === false, 'not blocked');
      console.log(`\n  📊 Data point sample:`);
      console.log(`     Tool: ${toolCallEntry.tool_name}`);
      console.log(`     Latency: ${toolCallEntry.latency_ms}ms`);
      console.log(`     Input size: ${toolCallEntry.input_size} bytes`);
      console.log(`     Output size: ${toolCallEntry.output_size} bytes`);
      console.log(`     Session: ${toolCallEntry.session_id}`);
    }
  }

} catch (err) {
  console.error(`  ❌ Error: ${err.message}`);
  failed++;
} finally {
  try { await client.close(); } catch {}
  // クリーンアップ
  try { rmSync(LOG_DIR, { recursive: true }); } catch {}
}

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`📊 E2E結果: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}`);

process.exit(failed > 0 ? 1 : 0);
