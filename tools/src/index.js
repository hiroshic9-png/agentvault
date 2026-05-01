/**
 * AgentVault Tools — Free MCP Server
 * 
 * APIキー不要のWeb検索 & フェッチ。
 * エージェントの最も基本的なニーズを無料で満たす「水飲み場」。
 * 
 * ツール:
 *   - web_search: DuckDuckGoでWeb検索（APIキー不要）
 *   - web_fetch:  URLからテキストコンテンツを取得
 * 
 * テレメトリ（opt-in）:
 *   AGENTVAULT_TELEMETRY=true で匿名利用統計を送信
 *   検索クエリやURL等のコンテンツは一切送信しない
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { webSearch } from './search.js';
import { webFetch } from './fetch.js';
import { randomUUID } from 'crypto';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const VERSION = '0.1.0';
const TELEMETRY_ENDPOINT = 'https://agentvault-telemetry.onrender.com/api/telemetry';

export class AgentVaultTools {
  constructor() {
    this.sessionId = randomUUID();
    this.telemetryEnabled = process.env.AGENTVAULT_TELEMETRY === 'true';
    this.telemetryBuffer = [];
    this.callCount = 0;

    this.server = new Server(
      { name: 'agentvault-tools', version: VERSION },
      { capabilities: { tools: {} } }
    );

    this._setupHandlers();
    
    // 定期テレメトリフラッシュ（30秒）
    if (this.telemetryEnabled) {
      this._flushTimer = setInterval(() => this._flushTelemetry(), 30000);
    }
  }

  _setupHandlers() {
    // tools/list
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'web_search',
          description: 'Search the web using DuckDuckGo. No API key required. Returns titles, URLs, and snippets for the top results.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query string',
              },
              max_results: {
                type: 'number',
                description: 'Maximum number of results to return (default: 8, max: 20)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'web_fetch',
          description: 'Fetch the text content of a web page. Converts HTML to clean text, removing navigation, ads, and scripts. Useful for reading articles, documentation, and web pages.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to fetch content from',
              },
              max_length: {
                type: 'number',
                description: 'Maximum content length in characters (default: 50000)',
              },
            },
            required: ['url'],
          },
        },
      ],
    }));

    // tools/call
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const start = Date.now();
      this.callCount++;

      try {
        let result;

        switch (name) {
          case 'web_search': {
            const maxResults = Math.min(args.max_results || 8, 20);
            const results = await webSearch(args.query, maxResults);
            
            if (results.length === 0) {
              result = 'No results found.';
            } else {
              result = results.map((r, i) => 
                `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`
              ).join('\n\n');
            }

            this._recordTelemetry({
              tool: 'web_search',
              latencyMs: Date.now() - start,
              resultCount: results.length,
              outputSize: result.length,
              error: null,
            });
            break;
          }

          case 'web_fetch': {
            const data = await webFetch(args.url, args.max_length);
            result = `# ${data.title || 'Untitled'}\nSource: ${data.url}\n\n${data.content}`;

            this._recordTelemetry({
              tool: 'web_fetch',
              latencyMs: Date.now() - start,
              resultCount: 1,
              outputSize: result.length,
              error: null,
            });
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [{ type: 'text', text: result }],
        };

      } catch (err) {
        this._recordTelemetry({
          tool: name,
          latencyMs: Date.now() - start,
          resultCount: 0,
          outputSize: 0,
          error: err.message,
        });

        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        };
      }
    });
  }

  /**
   * テレメトリ記録（コンテンツは一切含まない）
   */
  _recordTelemetry(data) {
    const dp = {
      event_type: 'tool_call',
      tool_name: data.tool,
      source: 'agentvault-tools',
      session_id: this.sessionId,
      latency_ms: data.latencyMs,
      input_size: 0, // クエリ/URLは送信しない
      output_size: data.outputSize,
      blocked: false,
      error: data.error,
      timestamp: new Date().toISOString(),
      meta: {
        result_count: data.resultCount,
        version: VERSION,
      },
    };

    // ローカルログ（常時）
    try {
      const logDir = join(process.cwd(), 'agentvault-logs');
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
      const date = new Date().toISOString().split('T')[0];
      appendFileSync(join(logDir, `tools_${date}.jsonl`), JSON.stringify(dp) + '\n');
    } catch { /* ignore */ }

    // リモートバッファ（opt-in時のみ）
    if (this.telemetryEnabled) {
      this.telemetryBuffer.push(dp);
    }
  }

  async _flushTelemetry() {
    if (this.telemetryBuffer.length === 0) return;
    const batch = [...this.telemetryBuffer];
    this.telemetryBuffer = [];

    try {
      await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch,
          source: 'agentvault-tools',
          session_id: this.sessionId,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      this.telemetryBuffer.unshift(...batch);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🏴‍☠️ AgentVault Tools v${VERSION} — Free web search & fetch`);
    console.error(`   Telemetry: ${this.telemetryEnabled ? 'ON (opt-in)' : 'OFF'}`);
  }

  async shutdown() {
    clearInterval(this._flushTimer);
    await this._flushTelemetry();
  }
}

export default AgentVaultTools;
