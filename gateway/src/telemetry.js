/**
 * AgentVault Gateway — Telemetry Core
 * 
 * 全データ収集装置で共通のテレメトリ基盤。
 * 収集するデータの構造を統一し、将来のデータ分析基盤に接続する。
 */

import { randomUUID } from 'crypto';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TELEMETRY_VERSION = '0.1.0';

export class TelemetryCore {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.endpoint = options.endpoint || null;
    this.logDir = options.logDir || './agentvault-logs';
    this.sessionId = randomUUID();
    this.source = options.source || 'unknown'; // 'gateway', 'agentscore', 'library'
    this.buffer = [];
    this.flushInterval = options.flushIntervalMs || 5000;
    
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
    
    // 定期フラッシュ
    if (this.enabled) {
      this._flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }
  }

  /**
   * データポイントを記録
   * 全装置共通のスキーマ
   */
  record(event) {
    if (!this.enabled) return;

    const dataPoint = {
      // メタデータ
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      version: TELEMETRY_VERSION,
      session_id: this.sessionId,
      source: this.source,
      
      // エージェントフィンガープリント（匿名化）
      agent_fingerprint: this._fingerprint(event.agentInfo || {}),
      
      // イベントデータ
      event_type: event.type, // 'tool_call', 'tool_result', 'error', 'security_block'
      tool_name: event.toolName || null,
      
      // 計測データ（内容は含まない、メタデータのみ）
      input_size: event.inputSize || 0,
      output_size: event.outputSize || 0,
      latency_ms: event.latencyMs || 0,
      token_count: event.tokenCount || 0,
      
      // セキュリティ
      blocked: event.blocked || false,
      block_reason: event.blockReason || null,
      
      // エラー
      error: event.error || null,
      error_type: event.errorType || null,
    };

    this.buffer.push(dataPoint);
    
    // ローカルログに即座に書き込み
    this._writeLocal(dataPoint);
    
    return dataPoint;
  }

  /**
   * エージェントのフィンガープリント（匿名化）
   * 個人情報は含まない。パターン分析用。
   */
  _fingerprint(agentInfo) {
    return {
      framework: agentInfo.framework || 'unknown', // langchain, crewai, etc.
      model: agentInfo.model || 'unknown',          // gpt-4o, claude-3.5, etc.
      platform: agentInfo.platform || 'unknown',    // cursor, vscode, cli
      agent_hash: agentInfo.agentId 
        ? this._hash(agentInfo.agentId)  // IDのハッシュ（元のIDは保存しない）
        : 'anonymous',
    };
  }

  /**
   * 簡易ハッシュ（匿名化用）
   */
  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `agent_${Math.abs(hash).toString(36)}`;
  }

  /**
   * ローカルJSONLファイルに書き込み
   */
  _writeLocal(dataPoint) {
    const date = new Date().toISOString().split('T')[0];
    const filePath = join(this.logDir, `${this.source}_${date}.jsonl`);
    appendFileSync(filePath, JSON.stringify(dataPoint) + '\n');
  }

  /**
   * バッファをリモートエンドポイントにフラッシュ
   */
  async flush() {
    if (!this.endpoint || this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];
    
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batch,
          source: this.source,
          session_id: this.sessionId,
        }),
      });
    } catch (err) {
      // リモート送信失敗時はローカルに保存済みなのでデータロストなし
      console.error('[AgentVault] Telemetry flush failed:', err.message);
      // バッファに戻す
      this.buffer.unshift(...batch);
    }
  }

  /**
   * 統計サマリー（ダッシュボード用）
   */
  getStats() {
    return {
      session_id: this.sessionId,
      source: this.source,
      total_events: this.buffer.length,
      uptime_ms: Date.now() - this._startTime,
    };
  }

  /**
   * クリーンアップ
   */
  async shutdown() {
    clearInterval(this._flushTimer);
    await this.flush();
  }
}

export default TelemetryCore;
