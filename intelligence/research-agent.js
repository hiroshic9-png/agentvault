#!/usr/bin/env node
/**
 * AgentVault Research Agent — 自社データ生成装置
 * 
 * MCPサーバーを巡回し、Gateway経由で実際にツールを呼び出して
 * リアルなテレメトリデータを生成する。
 * 
 * データ戦略:
 *   1. tools/list で全ツール一覧を取得（メタデータ収集）
 *   2. 安全なread系ツールを自動呼び出し（リアルtool_callデータ）
 *   3. レスポンスのメタデータ（サイズ・レイテンシ・エラー率）を記録
 *   4. テレメトリサーバーに一括送信
 * 
 * Usage:
 *   node research-agent.js                   # 全ターゲットを巡回
 *   node research-agent.js --dry-run         # テレメトリ送信せず表示のみ
 *   node research-agent.js --target "npx -y @modelcontextprotocol/server-memory"
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==============================
// 設定
// ==============================
const TELEMETRY_ENDPOINT = process.env.AGENTVAULT_TELEMETRY_ENDPOINT 
  || 'https://agentvault-telemetry.onrender.com/api/telemetry';
const TARGETS_FILE = path.join(__dirname, '..', 'agentscore', 'targets.txt');
const SESSION_ID = `patrol-${new Date().toISOString().split('T')[0]}-${randomUUID().slice(0, 8)}`;
const CONNECT_TIMEOUT = 15000;
const CALL_TIMEOUT = 10000;

// 安全なツールパターン（read系のみ呼び出す）
const SAFE_TOOL_PATTERNS = [
  /^(list|read|get|search|show|describe|check|validate|inspect|view|find|query|scan|status|info|help)/i,
  /^read_graph$/,
  /^search_nodes$/,
  /^open_nodes$/,
  /^list_directory$/,
  /^directory_tree$/,
  /^get_file_info$/,
  /^list_allowed_directories$/,
  /^list_tools$/,
];

// 明示的に除外するツール（副作用あり）
const BLOCKED_TOOL_PATTERNS = [
  /^(write|create|update|delete|remove|drop|truncate|exec|run|send|post|put|patch|set|add|insert|move|rename|edit|modify)/i,
  /^(deploy|publish|push|commit|merge|reset|destroy|terminate|kill|stop|restart|shutdown)/i,
];

function isSafeTool(toolName) {
  if (BLOCKED_TOOL_PATTERNS.some(p => p.test(toolName))) return false;
  if (SAFE_TOOL_PATTERNS.some(p => p.test(toolName))) return true;
  return false;
}

// ==============================
// MCP サーバー巡回
// ==============================
async function patrolServer(target) {
  const dataPoints = [];
  let client = null;
  let transport = null;
  const serverStart = Date.now();
  
  try {
    // 接続
    const parts = target.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    transport = new StdioClientTransport({ command, args, stderr: 'pipe' });
    client = new Client(
      { name: 'agentvault-patrol', version: '0.1.0' },
      { capabilities: {} }
    );

    // タイムアウト付き接続
    await Promise.race([
      client.connect(transport),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), CONNECT_TIMEOUT)),
    ]);

    const serverInfo = client.getServerVersion();
    const serverName = serverInfo?.name || target.split('/').pop()?.split(' ')[0] || 'unknown';

    // データポイント: 接続成功
    dataPoints.push({
      event_type: 'server_connect',
      tool_name: serverName,
      source: 'patrol',
      session_id: SESSION_ID,
      latency_ms: Date.now() - serverStart,
      input_size: 0,
      output_size: 0,
      blocked: false,
      timestamp: new Date().toISOString(),
      meta: {
        server_name: serverName,
        server_version: serverInfo?.version || 'unknown',
        target: target,
      },
    });

    // tools/list
    const toolsStart = Date.now();
    const toolsResp = await client.listTools();
    const tools = toolsResp.tools || [];
    const toolsLatency = Date.now() - toolsStart;

    dataPoints.push({
      event_type: 'tools_list',
      tool_name: serverName,
      source: 'patrol',
      session_id: SESSION_ID,
      latency_ms: toolsLatency,
      input_size: 0,
      output_size: JSON.stringify(tools).length,
      blocked: false,
      timestamp: new Date().toISOString(),
      meta: {
        server_name: serverName,
        tool_count: tools.length,
        tools: tools.map(t => t.name),
      },
    });

    // 安全なツールを呼び出す
    const safeTools = tools.filter(t => isSafeTool(t.name));
    
    for (const tool of safeTools.slice(0, 5)) { // 最大5ツールまで
      const callStart = Date.now();
      try {
        // 引数なしまたは最小限の引数で呼び出し
        const callArgs = buildSafeArgs(tool);
        
        const result = await Promise.race([
          client.callTool({ name: tool.name, arguments: callArgs }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Call timeout')), CALL_TIMEOUT)),
        ]);
        
        const resultStr = JSON.stringify(result);
        
        dataPoints.push({
          event_type: 'tool_call',
          tool_name: tool.name,
          source: 'patrol',
          session_id: SESSION_ID,
          latency_ms: Date.now() - callStart,
          input_size: JSON.stringify(callArgs).length,
          output_size: resultStr.length,
          blocked: false,
          error: result.isError ? 'tool_error' : null,
          timestamp: new Date().toISOString(),
          meta: {
            server_name: serverName,
            has_result: !result.isError,
            content_types: result.content?.map(c => c.type) || [],
          },
        });
      } catch (err) {
        dataPoints.push({
          event_type: 'tool_error',
          tool_name: tool.name,
          source: 'patrol',
          session_id: SESSION_ID,
          latency_ms: Date.now() - callStart,
          input_size: 0,
          output_size: 0,
          blocked: false,
          error: err.message,
          error_type: err.constructor.name,
          timestamp: new Date().toISOString(),
          meta: { server_name: serverName },
        });
      }
    }

    console.log(`  ✅ ${serverName}: ${tools.length} tools, ${safeTools.length} safe, ${dataPoints.length} data points`);

  } catch (err) {
    const serverName = target.split('/').pop()?.split(' ')[0] || 'unknown';
    dataPoints.push({
      event_type: 'server_error',
      tool_name: serverName,
      source: 'patrol',
      session_id: SESSION_ID,
      latency_ms: Date.now() - serverStart,
      input_size: 0,
      output_size: 0,
      blocked: false,
      error: err.message,
      error_type: err.constructor.name,
      timestamp: new Date().toISOString(),
      meta: { target },
    });
    console.log(`  ❌ ${serverName}: ${err.message}`);
  } finally {
    try { if (client) await client.close(); } catch {}
    try { if (transport) transport._process?.kill(); } catch {}
  }

  return dataPoints;
}

/**
 * ツールの引数を安全に構築
 * required フィールドに最小限のダミー値を入れる
 */
function buildSafeArgs(tool) {
  const schema = tool.inputSchema;
  if (!schema?.properties) return {};
  
  const args = {};
  const required = schema.required || [];
  
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (!required.includes(name)) continue;
    
    switch (prop.type) {
      case 'string':
        // 安全なデフォルト値
        if (/path|file|dir/i.test(name)) args[name] = '/tmp';
        else if (/query|search|term|keyword/i.test(name)) args[name] = 'test';
        else if (/name/i.test(name)) args[name] = 'test';
        else if (/url/i.test(name)) args[name] = 'https://example.com';
        else args[name] = 'test';
        break;
      case 'number':
      case 'integer':
        args[name] = prop.minimum || 1;
        break;
      case 'boolean':
        args[name] = false;
        break;
      case 'array':
        args[name] = [];
        break;
      case 'object':
        args[name] = {};
        break;
      default:
        args[name] = 'test';
    }
  }
  
  return args;
}

// ==============================
// テレメトリ送信
// ==============================
async function sendTelemetry(batch) {
  if (batch.length === 0) return { status: 'empty' };
  
  try {
    const resp = await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch,
        source: 'patrol',
        session_id: SESSION_ID,
      }),
      signal: AbortSignal.timeout(30000),
    });
    
    return await resp.json();
  } catch (err) {
    console.error(`❌ Telemetry send failed: ${err.message}`);
    return { error: err.message };
  }
}

// ==============================
// メイン
// ==============================
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const singleTargetIdx = args.indexOf('--target');
  
  console.log(`\n🏴‍☠️ AgentVault Research Agent — Patrol Mission`);
  console.log(`   Session: ${SESSION_ID}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Telemetry: ${TELEMETRY_ENDPOINT}\n`);

  let targets;
  
  if (singleTargetIdx >= 0) {
    targets = [args[singleTargetIdx + 1]];
  } else {
    if (!fs.existsSync(TARGETS_FILE)) {
      console.error(`❌ Targets file not found: ${TARGETS_FILE}`);
      process.exit(1);
    }
    targets = fs.readFileSync(TARGETS_FILE, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
  }

  console.log(`📡 Patrolling ${targets.length} servers...\n`);

  const allDataPoints = [];
  let successCount = 0;
  let errorCount = 0;

  for (const target of targets) {
    const points = await patrolServer(target);
    allDataPoints.push(...points);
    
    const hasError = points.some(p => p.event_type === 'server_error');
    if (hasError) errorCount++;
    else successCount++;
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`📊 Patrol Summary`);
  console.log(`═══════════════════════════════════`);
  console.log(`  Servers: ${successCount} success / ${errorCount} error / ${targets.length} total`);
  console.log(`  Data Points: ${allDataPoints.length}`);

  // ローカルにもバックアップ保存
  const localDir = path.join(__dirname, 'patrol-data');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const localFile = path.join(localDir, `patrol_${new Date().toISOString().split('T')[0]}.jsonl`);
  for (const dp of allDataPoints) {
    fs.appendFileSync(localFile, JSON.stringify(dp) + '\n');
  }
  console.log(`  Local backup: ${localFile}`);

  // テレメトリ送信
  if (!dryRun) {
    console.log(`\n📡 Sending ${allDataPoints.length} data points to telemetry server...`);
    
    // バッチサイズ制限（1000）に対応して分割送信
    const BATCH_SIZE = 500;
    for (let i = 0; i < allDataPoints.length; i += BATCH_SIZE) {
      const chunk = allDataPoints.slice(i, i + BATCH_SIZE);
      const result = await sendTelemetry(chunk);
      console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${JSON.stringify(result)}`);
    }
  } else {
    console.log(`\n🏃 DRY RUN — skipping telemetry send`);
    console.log(`  Sample data point:`);
    console.log(JSON.stringify(allDataPoints[0], null, 2));
  }

  console.log(`\n🏴‍☠️ Patrol complete.`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
