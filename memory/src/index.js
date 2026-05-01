/**
 * AgentVault Memory — MCP Server
 * 
 * ローカルファーストの永続メモリ。エージェントの長期記憶を提供。
 * 
 * 差別化:
 *   - server-memory: Knowledge Graph型 → 構造化が必要、複雑
 *   - agentvault-memory: シンプルなノート型 → 自然言語メモ + 全文検索、ゼロ設定
 * 
 * ツール:
 *   - save_memory:    テキストメモを保存（タグ・重要度付き）
 *   - search_memory:  全文検索（FTS5）でメモリを検索
 *   - list_memories:  最近のメモリ一覧 or タグ絞り込み
 *   - delete_memory:  メモリを削除
 *   - memory_stats:   メモリの統計情報
 * 
 * ストレージ: ローカルSQLite（~/.agentvault/memory.db）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MemoryStore } from './store.js';
import { homedir } from 'os';
import { join } from 'path';

const VERSION = '0.1.0';

export class AgentVaultMemory {
  constructor(options = {}) {
    const dbPath = options.dbPath 
      || process.env.AGENTVAULT_MEMORY_DB 
      || join(homedir(), '.agentvault', 'memory.db');
    
    this.store = new MemoryStore(dbPath);
    this.dbPath = dbPath;

    this.server = new Server(
      { name: 'agentvault-memory', version: VERSION },
      { capabilities: { tools: {} } }
    );

    this._setupHandlers();
  }

  _setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'save_memory',
          description: 'Save a piece of information to persistent memory. Use this to remember facts, decisions, preferences, solutions, or anything the user might need later. Memories persist across sessions.',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'The information to remember. Can be any text — facts, code snippets, decisions, preferences, etc.',
              },
              tags: {
                type: 'string',
                description: 'Comma-separated tags for categorization (e.g., "project,decision,python")',
              },
              importance: {
                type: 'number',
                description: 'Importance level 1-10. Higher = more important. Default: 5',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'search_memory',
          description: 'Search through saved memories using full-text search. Use this to recall previously saved information, find past decisions, or look up stored knowledge.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query — keywords or natural language',
              },
              limit: {
                type: 'number',
                description: 'Maximum results to return (default: 10)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_memories',
          description: 'List recent memories or filter by tag. Use this to browse what has been remembered.',
          inputSchema: {
            type: 'object',
            properties: {
              tag: {
                type: 'string',
                description: 'Filter by tag (optional)',
              },
              limit: {
                type: 'number',
                description: 'Maximum results (default: 20)',
              },
            },
          },
        },
        {
          name: 'delete_memory',
          description: 'Delete a specific memory by its ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: 'Memory ID to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'memory_stats',
          description: 'Get statistics about stored memories — total count, tags, and most accessed.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case 'save_memory': {
            const id = this.store.save(
              args.content,
              args.tags || '',
              'agent',
              Math.min(Math.max(args.importance || 5, 1), 10)
            );
            result = `✅ Memory saved (ID: ${id})\nContent: ${args.content.substring(0, 100)}${args.content.length > 100 ? '...' : ''}\nTags: ${args.tags || '(none)'}`;
            break;
          }

          case 'search_memory': {
            const results = this.store.search(args.query, args.limit || 10);
            if (results.length === 0) {
              result = 'No memories found matching your query.';
            } else {
              result = results.map((m, i) => 
                `**[${m.id}]** ${m.content}\n   Tags: ${m.tags || '-'} | Importance: ${m.importance} | Saved: ${m.created_at} | Accessed: ${m.access_count}x`
              ).join('\n\n');
              result = `Found ${results.length} memories:\n\n${result}`;
            }
            break;
          }

          case 'list_memories': {
            const results = args.tag 
              ? this.store.listByTag(args.tag, args.limit || 20)
              : this.store.listRecent(args.limit || 20);
            if (results.length === 0) {
              result = 'No memories stored yet.';
            } else {
              result = results.map(m => 
                `**[${m.id}]** ${m.content.substring(0, 120)}${m.content.length > 120 ? '...' : ''}\n   Tags: ${m.tags || '-'} | ${m.created_at}`
              ).join('\n\n');
            }
            break;
          }

          case 'delete_memory': {
            const deleted = this.store.delete(args.id);
            result = deleted 
              ? `✅ Memory ${args.id} deleted.`
              : `❌ Memory ${args.id} not found.`;
            break;
          }

          case 'memory_stats': {
            const stats = this.store.stats();
            result = `📊 Memory Statistics\n` +
              `Total memories: ${stats.total_memories}\n` +
              `Tags: ${stats.unique_tags.join(', ') || '(none)'}\n` +
              `Most accessed:\n${stats.most_accessed.map(m => `  [${m.id}] ${m.preview} (${m.access_count}x)`).join('\n')}`;
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`🧠 AgentVault Memory v${VERSION} — Local-first persistent memory`);
    console.error(`   Database: ${this.dbPath}`);
  }
}

export default AgentVaultMemory;
