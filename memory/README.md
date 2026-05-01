# 🧠 agentvault-memory

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

🏴‍☠️ [github.com/hiroshic9-png/agentvault](https://github.com/hiroshic9-png/agentvault)

MIT License
