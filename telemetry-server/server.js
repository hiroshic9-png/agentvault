/**
 * AgentVault — Telemetry Collection Server
 * 
 * Gateway/Guard/Score 利用者からの匿名テレメトリを受信・蓄積する軽量サーバー。
 * Render無料枠で稼働可能。
 * 
 * データフロー:
 *   [開発者のGateway] → POST /api/telemetry → [このサーバー] → JSONLファイル蓄積
 *   [このサーバー]    → GET /api/stats      → パブリック統計
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3300;
const DATA_DIR = path.join(__dirname, 'data');

// データディレクトリ作成
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// インメモリ統計
const stats = {
  total_data_points: 0,
  total_sessions: new Set(),
  total_tool_calls: 0,
  total_security_blocks: 0,
  tools_seen: new Set(),
  sources: {},
  started_at: new Date().toISOString(),
};

// 起動時に既存データを読み込む
function loadExistingStats() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.jsonl'));
  for (const file of files) {
    const lines = fs.readFileSync(path.join(DATA_DIR, file), 'utf8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const dp = JSON.parse(line);
        stats.total_data_points++;
        if (dp.session_id) stats.total_sessions.add(dp.session_id);
        if (dp.event_type === 'tool_call') stats.total_tool_calls++;
        if (dp.event_type === 'security_block') stats.total_security_blocks++;
        if (dp.tool_name) stats.tools_seen.add(dp.tool_name);
        if (dp.source) stats.sources[dp.source] = (stats.sources[dp.source] || 0) + 1;
      } catch {}
    }
  }
  console.log(`📊 Loaded ${stats.total_data_points} existing data points`);
}

loadExistingStats();

// CORS headers
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// リクエストボディを読む
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  setCORS(res);
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ========================================
  // POST /api/telemetry — データ受信
  // ========================================
  if (url.pathname === '/api/telemetry' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req));
      const { batch, source, session_id } = body;

      if (!Array.isArray(batch) || batch.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Empty batch' }));
      }

      // データサイズ制限（1リクエスト最大1000データポイント）
      if (batch.length > 1000) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Batch too large (max 1000)' }));
      }

      // 日付別ファイルに書き込み
      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(DATA_DIR, `telemetry_${date}.jsonl`);
      
      let written = 0;
      for (const dp of batch) {
        // 最低限のバリデーション
        if (!dp.event_type) continue;
        
        // サーバー側メタデータを追加
        dp._received_at = new Date().toISOString();
        dp._source_ip = req.socket.remoteAddress; // ログ用（分析には使わない）
        
        fs.appendFileSync(filePath, JSON.stringify(dp) + '\n');
        written++;
        
        // 統計更新
        stats.total_data_points++;
        if (dp.session_id) stats.total_sessions.add(dp.session_id);
        if (dp.event_type === 'tool_call') stats.total_tool_calls++;
        if (dp.event_type === 'security_block') stats.total_security_blocks++;
        if (dp.tool_name) stats.tools_seen.add(dp.tool_name);
        if (dp.source) stats.sources[dp.source] = (stats.sources[dp.source] || 0) + 1;
      }

      console.log(`📥 Received ${written} data points from ${source || 'unknown'} (session: ${session_id?.slice(0, 8)})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        received: written,
        total: stats.total_data_points 
      }));
    } catch (err) {
      console.error('❌ Telemetry error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
    return;
  }

  // ========================================
  // GET /api/stats — パブリック統計
  // ========================================
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      total_data_points: stats.total_data_points,
      unique_sessions: stats.total_sessions.size,
      total_tool_calls: stats.total_tool_calls,
      total_security_blocks: stats.total_security_blocks,
      unique_tools: stats.tools_seen.size,
      sources: stats.sources,
      started_at: stats.started_at,
      uptime_hours: Math.round((Date.now() - new Date(stats.started_at).getTime()) / 3600000 * 10) / 10,
    }));
    return;
  }

  // ========================================
  // GET / — ヘルスチェック
  // ========================================
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      service: 'agentvault-telemetry',
      data_points: stats.total_data_points 
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🏴‍☠️ AgentVault Telemetry Server running on port ${PORT}`);
  console.log(`   📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`   📥 Endpoint: http://localhost:${PORT}/api/telemetry`);
});
