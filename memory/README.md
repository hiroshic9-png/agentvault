# 🧠 agentvault-memory

[![npm version](https://img.shields.io/npm/v/agentvault-memory?color=cc3534)](https://www.npmjs.com/package/agentvault-memory)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Local-first persistent memory for AI agents — zero setup, full-text search, no cloud required.**

Give your AI agent long-term memory that survives across sessions. Unlike knowledge graph solutions that require complex setup, agentvault-memory is a simple note-taking system with powerful full-text search.

## Why?

| Existing Solutions | Problem |
|-------------------|---------|
| `server-memory` (Knowledge Graph) | Complex entity/relation model. Requires structured input. |
| Mem0, Cognee | Cloud-based, expensive, privacy concerns |
| Vector databases | Over-engineered for most use cases |

**agentvault-memory**: Save text → Search text. That's it. SQLite + FTS5. Fast, private, local.

## Tools

| Tool | Description |
|------|-------------|
| `save_memory` | Save any text with tags and importance level |
| `search_memory` | Full-text search across all memories |
| `list_memories` | Browse recent memories or filter by tag |
| `delete_memory` | Remove a specific memory |
| `memory_stats` | View memory statistics |

## Quick Start

### Claude Desktop

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "agentvault-memory"]
    }
  }
}
```

### Then just talk to your agent:

> "Remember that the API endpoint is https://api.example.com/v2"
> → Agent calls save_memory

> "What was that API endpoint?"
> → Agent calls search_memory → finds it instantly

## Storage

All data is stored locally at `~/.agentvault/memory.db` (SQLite).

- **No cloud, no account, no API keys**
- Data never leaves your machine
- Override path: `AGENTVAULT_MEMORY_DB=/path/to/memory.db`

## Part of AgentVault

🏴‍☠️ **[AgentVault](https://github.com/hiroshic9-png/agentvault)** — The essential toolkit for AI agents.

> 💡 **Tip:** Memory is included in [agentvault-tools](https://www.npmjs.com/package/agentvault-tools) (9 tools in one package). Use the standalone `agentvault-memory` only if you want memory without the web/utility tools.

| Package | What it does |
|---------|-------------|
| [agentvault-tools](https://www.npmjs.com/package/agentvault-tools) | 🛠️ 9-tool MCP starter kit (includes memory) |
| **agentvault-memory** | 🧠 Local-first persistent memory (you are here) |
| [agentvault-guard](https://www.npmjs.com/package/agentvault-guard) | 🛡️ Tool poisoning detection |
| [agentvault-gateway](https://www.npmjs.com/package/agentvault-gateway) | 🔌 MCP proxy with audit logging |
| [agentvault-score](https://www.npmjs.com/package/agentvault-score) | 📊 Quality scoring (A+ to F) |
| [agentvault-retry](https://www.npmjs.com/package/agentvault-retry) | 🔄 Resilient calls with backoff |
| [agentvault-cache](https://www.npmjs.com/package/agentvault-cache) | ⚡ Smart result caching |

MIT License
