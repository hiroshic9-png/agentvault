/**
 * AgentVault Gateway — MCP Proxy Server
 * 
 * 全MCPサーバーの前に立つ門番。
 * エージェントのリクエストを中継し、全行動を記録する。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TelemetryCore } from './telemetry.js';
import { SecurityFilter } from './security.js';
import { readFileSync, existsSync } from 'fs';

// デフォルト設定
const DEFAULT_CONFIG = {
  target: null,
  security: {
    enabled: true,
    block_patterns: ['DELETE', 'DROP', 'TRUNCATE', 'rm -rf'],
    max_requests_per_minute: 120,
  },
  telemetry: {
    enabled: true,
    // opt-in: 環境変数 AGENTVAULT_TELEMETRY_ENDPOINT で中央サーバーに送信
    // デフォルトはローカルファイルのみ（プライバシー重視）
    endpoint: process.env.AGENTVAULT_TELEMETRY_ENDPOINT || null,
    logDir: './agentvault-logs',
  },
};

export class AgentVaultGateway {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // テレメトリ基盤（全装置共通）
    this.telemetry = new TelemetryCore({
      enabled: this.config.telemetry.enabled,
      endpoint: this.config.telemetry.endpoint,
      logDir: this.config.telemetry.logDir,
      source: 'gateway',
    });
    
    // セキュリティフィルター
    this.security = new SecurityFilter(this.config.security);
    
    // リクエストカウンター
    this.requestCount = 0;
    this.startTime = Date.now();
    
    // 対象MCPサーバーへのクライアント接続（遅延初期化）
    this._targetClient = null;
    this._targetConnecting = null;
    
    // MCPサーバー（ホスト側に公開するインターフェース）
    this.server = new Server(
      { name: 'agentvault-gateway', version: '0.2.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    
    this._setupHandlers();
  }

  /**
   * 対象MCPサーバーに接続（遅延初期化、一度だけ）
   * --target で指定されたコマンドをサブプロセスとして起動し、
   * MCP SDK の Client + StdioClientTransport で接続する。
   */
  async _connectTarget() {
    if (this._targetClient) return this._targetClient;
    
    // 同時接続の重複防止
    if (this._targetConnecting) return this._targetConnecting;
    
    this._targetConnecting = (async () => {
      if (!this.config.target) {
        throw new Error('No target MCP server configured. Use --target option.');
      }

      // --target "npx -y @modelcontextprotocol/server-github" をパースする
      const parts = this.config.target.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      console.error(`🔗 Connecting to target: ${command} ${args.join(' ')}`);

      const transport = new StdioClientTransport({
        command,
        args,
        stderr: 'pipe',
      });

      // stderrをGatewayのstderrに流す（デバッグ用）
      transport.stderr?.on('data', (chunk) => {
        process.stderr.write(`[target] ${chunk}`);
      });

      const client = new Client(
        { name: 'agentvault-gateway-client', version: '0.1.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      
      const serverInfo = client.getServerVersion();
      console.error(`✅ Connected to target: ${serverInfo?.name || 'unknown'} v${serverInfo?.version || '?'}`);

      this._targetClient = client;
      this._targetConnecting = null;
      return client;
    })();

    return this._targetConnecting;
  }

  /**
   * ハンドラー設定
   */
  _setupHandlers() {
    // tools/list — 対象MCPサーバーのツール一覧を中継
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async (request) => {
        const start = Date.now();
        
        try {
          const result = await this._forwardToTarget('tools/list', request.params);
          
          this.telemetry.record({
            type: 'tools_list',
            latencyMs: Date.now() - start,
            outputSize: JSON.stringify(result).length,
          });
          
          return result;
        } catch (err) {
          this.telemetry.record({
            type: 'error',
            error: err.message,
            errorType: 'tools_list_failed',
          });
          throw err;
        }
      }
    );

    // tools/call — ツール呼び出しを中継（ここが最重要のデータポイント）
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        const start = Date.now();
        const { name: toolName, arguments: toolArgs } = request.params;
        
        this.requestCount++;
        
        // セキュリティチェック
        const securityCheck = this.security.check(toolName, toolArgs);
        if (securityCheck.blocked) {
          this.telemetry.record({
            type: 'security_block',
            toolName,
            blocked: true,
            blockReason: securityCheck.reason,
            inputSize: JSON.stringify(toolArgs).length,
          });
          
          return {
            content: [{
              type: 'text',
              text: `⛔ AgentVault Security: Blocked "${toolName}" — ${securityCheck.reason}`
            }],
            isError: true,
          };
        }
        
        // レート制限チェック
        if (this.security.isRateLimited()) {
          this.telemetry.record({
            type: 'rate_limited',
            toolName,
            blocked: true,
            blockReason: 'Rate limit exceeded',
          });
          
          return {
            content: [{
              type: 'text',
              text: '⛔ AgentVault: Rate limit exceeded. Please slow down.'
            }],
            isError: true,
          };
        }
        
        try {
          // 対象MCPサーバーに転送
          const result = await this._forwardToTarget('tools/call', request.params);
          const latency = Date.now() - start;
          
          // 📊 データポイント記録（これが事業の核心）
          this.telemetry.record({
            type: 'tool_call',
            toolName,
            inputSize: JSON.stringify(toolArgs).length,
            outputSize: JSON.stringify(result).length,
            latencyMs: latency,
            blocked: false,
          });
          
          return result;
        } catch (err) {
          this.telemetry.record({
            type: 'tool_error',
            toolName,
            error: err.message,
            errorType: err.constructor.name,
            latencyMs: Date.now() - start,
          });
          throw err;
        }
      }
    );
  }

  /**
   * 対象MCPサーバーにリクエストを転送
   * MCP SDKのClientを通じて実際に対象サーバーと通信する。
   */
  async _forwardToTarget(method, params) {
    const client = await this._connectTarget();
    
    switch (method) {
      case 'tools/list':
        return await client.listTools(params);
      
      case 'tools/call':
        return await client.callTool(params);
      
      default:
        throw new Error(`Unsupported method for forwarding: ${method}`);
    }
  }

  /**
   * ステータス表示
   */
  getStatus() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'running',
      uptime_seconds: uptime,
      total_requests: this.requestCount,
      blocked_requests: this.security.blockedCount,
      telemetry: this.telemetry.enabled ? 'active' : 'disabled',
      target: this.config.target,
      target_connected: !!this._targetClient,
    };
  }

  /**
   * サーバー起動
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('🏴‍☠️ AgentVault Gateway v0.2.0 is running');
    console.error(`   Target: ${this.config.target || 'not configured'}`);
    console.error(`   Security: ${this.config.security.enabled ? 'ON' : 'OFF'}`);
    console.error(`   Telemetry: ${this.telemetry.enabled ? 'ON' : 'OFF'}`);
    if (this.config.telemetry.endpoint) {
      console.error(`   📡 Remote telemetry: ${this.config.telemetry.endpoint}`);
    }
    console.error(`   Logs: ${this.config.telemetry.logDir}`);
  }

  /**
   * グレースフルシャットダウン
   */
  async shutdown() {
    console.error('🛑 Shutting down...');
    
    // 対象サーバーとの接続を閉じる
    if (this._targetClient) {
      try {
        await this._targetClient.close();
        console.error('   Target connection closed.');
      } catch (err) {
        console.error(`   Target close error: ${err.message}`);
      }
    }
    
    // テレメトリをフラッシュ
    await this.telemetry.shutdown();
    console.error('   Telemetry flushed.');
  }
}

export default AgentVaultGateway;
