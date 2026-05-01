/**
 * AgentVault Tools v0.3.0 — The Essential MCP Toolkit
 * 
 * 9 tools in 1 package. Zero API keys. One install.
 * 「MCPのWindows」— エージェントの最初の1パッケージ。
 * 
 * Web:
 *   - web_search:     DuckDuckGoでWeb検索（APIキー不要）
 *   - web_fetch:      URLからテキストコンテンツを取得
 * 
 * Utility:
 *   - datetime:       現在日時・タイムゾーン変換
 *   - calc:           数式計算
 * 
 * Memory (persistent, local SQLite):
 *   - save_memory:    テキストメモを永続保存
 *   - search_memory:  全文検索（FTS5）
 *   - list_memories:  最近のメモリ一覧/タグ絞り込み
 *   - delete_memory:  メモリ削除
 *   - memory_stats:   メモリ統計
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { webSearch } from './search.js';
import { webFetch } from './fetch.js';
import { MemoryStore } from './store.js';
import { randomUUID } from 'crypto';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const VERSION = '0.3.0';
const TELEMETRY_ENDPOINT = 'https://agentvault-telemetry.onrender.com/api/telemetry';

export class AgentVaultTools {
  constructor() {
    this.sessionId = randomUUID();
    this.telemetryEnabled = process.env.AGENTVAULT_TELEMETRY === 'true';
    this.telemetryBuffer = [];
    this.callCount = 0;

    // Memory store
    const dbPath = process.env.AGENTVAULT_MEMORY_DB 
      || join(homedir(), '.agentvault', 'memory.db');
    this.memory = new MemoryStore(dbPath);
    this.dbPath = dbPath;

    this.server = new Server(
      { name: 'agentvault-tools', version: VERSION },
      { capabilities: { tools: {} } }
    );

    this._setupHandlers();
    
    if (this.telemetryEnabled) {
      this._flushTimer = setInterval(() => this._flushTelemetry(), 30000);
    }
  }

  _setupHandlers() {
    // ==================== tools/list ====================
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // --- Web ---
        {
          name: 'web_search',
          description: 'Search the web using DuckDuckGo. No API key required. Returns titles, URLs, and snippets.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              max_results: { type: 'number', description: 'Max results (default: 8, max: 20)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'web_fetch',
          description: 'Fetch a web page and convert to clean text. Removes nav, ads, scripts.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to fetch' },
              max_length: { type: 'number', description: 'Max content length (default: 50000)' },
            },
            required: ['url'],
          },
        },
        // --- Utility ---
        {
          name: 'datetime',
          description: 'Get current date/time in any timezone. IANA format.',
          inputSchema: {
            type: 'object',
            properties: {
              timezone: { type: 'string', description: 'IANA timezone (e.g., "Asia/Tokyo", "America/New_York"). Default: UTC' },
            },
          },
        },
        {
          name: 'calc',
          description: 'Evaluate a math expression. Supports +, -, *, /, %, **, parentheses, Math.sqrt/round/floor/ceil/abs/PI/E.',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'Math expression (e.g., "(2+3)*4", "Math.sqrt(144)")' },
            },
            required: ['expression'],
          },
        },
        // --- Memory ---
        {
          name: 'save_memory',
          description: 'Save information to persistent memory. Survives across sessions. Use for facts, decisions, preferences, code snippets.',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Text to remember' },
              tags: { type: 'string', description: 'Comma-separated tags (e.g., "project,config")' },
              importance: { type: 'number', description: 'Importance 1-10 (default: 5)' },
            },
            required: ['content'],
          },
        },
        {
          name: 'search_memory',
          description: 'Search saved memories using full-text search. Recall past decisions, stored facts, preferences.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search keywords' },
              limit: { type: 'number', description: 'Max results (default: 10)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_memories',
          description: 'List recent memories or filter by tag.',
          inputSchema: {
            type: 'object',
            properties: {
              tag: { type: 'string', description: 'Filter by tag (optional)' },
              limit: { type: 'number', description: 'Max results (default: 20)' },
            },
          },
        },
        {
          name: 'delete_memory',
          description: 'Delete a memory by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Memory ID to delete' },
            },
            required: ['id'],
          },
        },
        {
          name: 'memory_stats',
          description: 'Get memory statistics — total count, tags, most accessed.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }));

    // ==================== tools/call ====================
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const start = Date.now();
      this.callCount++;

      try {
        let result;

        switch (name) {
          // --- Web ---
          case 'web_search': {
            const maxResults = Math.min(args.max_results || 8, 20);
            const results = await webSearch(args.query, maxResults);
            result = results.length === 0 ? 'No results found.' :
              results.map((r, i) => `${i+1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`).join('\n\n');
            this._record('web_search', start, results.length, result.length);
            break;
          }

          case 'web_fetch': {
            const data = await webFetch(args.url, args.max_length);
            result = `# ${data.title || 'Untitled'}\nSource: ${data.url}\n\n${data.content}`;
            this._record('web_fetch', start, 1, result.length);
            break;
          }

          // --- Utility ---
          case 'datetime': {
            const tz = (args && args.timezone) || 'UTC';
            try {
              const now = new Date();
              const formatted = now.toLocaleString('en-US', {
                timeZone: tz, weekday: 'long', year: 'numeric', month: 'long',
                day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
              });
              const iso = now.toLocaleString('sv', { timeZone: tz }).replace(' ', 'T');
              result = `**${formatted}**\nTimezone: ${tz}\nISO: ${iso}\nUnix: ${Math.floor(now.getTime() / 1000)}`;
            } catch {
              result = `Error: Invalid timezone "${tz}". Use IANA format (e.g., America/New_York)`;
            }
            this._record('datetime', start, 1, result.length);
            break;
          }

          case 'calc': {
            const expr = args.expression;
            try {
              const value = Function('Math', `"use strict"; return (${expr})`)(Math);
              if (typeof value !== 'number' && typeof value !== 'bigint') throw new Error('Result is not a number');
              result = `${expr} = **${value}**`;
            } catch (e) {
              result = `Error evaluating "${expr}": ${e.message}`;
            }
            this._record('calc', start, 1, result.length);
            break;
          }

          // --- Memory ---
          case 'save_memory': {
            const id = this.memory.save(
              args.content, args.tags || '', 'agent',
              Math.min(Math.max(args.importance || 5, 1), 10)
            );
            result = `✅ Memory saved (ID: ${id})\nContent: ${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}\nTags: ${args.tags || '(none)'}`;
            this._record('save_memory', start, 1, result.length);
            break;
          }

          case 'search_memory': {
            const results = this.memory.search(args.query, args.limit || 10);
            if (results.length === 0) {
              result = 'No memories found matching your query.';
            } else {
              result = `Found ${results.length} memories:\n\n` +
                results.map(m => `**[${m.id}]** ${m.content}\n   Tags: ${m.tags || '-'} | Importance: ${m.importance} | Saved: ${m.created_at} | Accessed: ${m.access_count}x`).join('\n\n');
            }
            this._record('search_memory', start, results.length, result.length);
            break;
          }

          case 'list_memories': {
            const mems = args.tag
              ? this.memory.listByTag(args.tag, args.limit || 20)
              : this.memory.listRecent(args.limit || 20);
            if (mems.length === 0) {
              result = 'No memories stored yet.';
            } else {
              result = mems.map(m =>
                `**[${m.id}]** ${m.content.substring(0, 120)}${m.content.length > 120 ? '...' : ''}\n   Tags: ${m.tags || '-'} | ${m.created_at}`
              ).join('\n\n');
            }
            this._record('list_memories', start, mems.length, result.length);
            break;
          }

          case 'delete_memory': {
            const deleted = this.memory.delete(args.id);
            result = deleted ? `✅ Memory ${args.id} deleted.` : `❌ Memory ${args.id} not found.`;
            this._record('delete_memory', start, deleted ? 1 : 0, result.length);
            break;
          }

          case 'memory_stats': {
            const stats = this.memory.stats();
            result = `📊 Memory Statistics\nTotal memories: ${stats.total_memories}\nTags: ${stats.unique_tags.join(', ') || '(none)'}\nMost accessed:\n${stats.most_accessed.map(m => `  [${m.id}] ${m.preview} (${m.access_count}x)`).join('\n')}`;
            this._record('memory_stats', start, 1, result.length);
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return { content: [{ type: 'text', text: result }] };

      } catch (err) {
        this._record(name, start, 0, 0, err.message);
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    });
  }

  /** Compact telemetry helper */
  _record(tool, start, count, size, error = null) {
    const dp = {
      event_type: 'tool_call', tool_name: tool, source: 'agentvault-tools',
      session_id: this.sessionId, latency_ms: Date.now() - start,
      input_size: 0, output_size: size, blocked: false, error,
      timestamp: new Date().toISOString(),
      meta: { result_count: count, version: VERSION },
    };

    // Local log (always)
    try {
      const logDir = join(process.cwd(), 'agentvault-logs');
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
      const date = new Date().toISOString().split('T')[0];
      appendFileSync(join(logDir, `tools_${date}.jsonl`), JSON.stringify(dp) + '\n');
    } catch { /* ignore */ }

    if (this.telemetryEnabled) this.telemetryBuffer.push(dp);
  }

  async _flushTelemetry() {
    if (this.telemetryBuffer.length === 0) return;
    const batch = [...this.telemetryBuffer];
    this.telemetryBuffer = [];
    try {
      await fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch, source: 'agentvault-tools', session_id: this.sessionId }),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      this.telemetryBuffer.unshift(...batch);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🏴‍☠️ AgentVault Tools v${VERSION} — 9 tools, zero API keys`);
    console.error(`   Memory: ${this.dbPath}`);
    console.error(`   Telemetry: ${this.telemetryEnabled ? 'ON (opt-in)' : 'OFF'}`);
  }

  async shutdown() {
    clearInterval(this._flushTimer);
    await this._flushTelemetry();
    this.memory.close();
  }
}

export default AgentVaultTools;
