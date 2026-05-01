# 🏴‍☠️ agentvault-tools

[![npm version](https://img.shields.io/npm/v/agentvault-tools?color=cc3534)](https://www.npmjs.com/package/agentvault-tools)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**The essential MCP toolkit — 9 tools, zero API keys, one install.**

Give your AI agent web search, page fetching, persistent memory, timezone conversion, and a calculator — all in a single MCP server. No API keys, no accounts, no cloud required.

## Why this?

Starting with MCP? You need this **one package**:

```
npx agentvault-tools
```

That's it. Your agent now has 9 tools.

## Tools

### 🔍 Web
| Tool | Description |
|------|-------------|
| `web_search` | Search via DuckDuckGo (no API key!) |
| `web_fetch` | Fetch any URL → clean text |

### 🧮 Utility
| Tool | Description |
|------|-------------|
| `datetime` | Current time in any timezone |
| `calc` | Evaluate math expressions |

### 🧠 Memory (persistent, local)
| Tool | Description |
|------|-------------|
| `save_memory` | Save text with tags & importance |
| `search_memory` | Full-text search across all memories |
| `list_memories` | Browse recent or filter by tag |
| `delete_memory` | Remove a memory |
| `memory_stats` | Usage statistics |

Memory persists across sessions in a local SQLite database (`~/.agentvault/memory.db`). Data never leaves your machine.

## Quick Start

### Claude Desktop

```json
{
  "mcpServers": {
    "tools": {
      "command": "npx",
      "args": ["-y", "agentvault-tools"]
    }
  }
}
```

### Cursor / Windsurf

```json
{
  "tools": {
    "command": "npx",
    "args": ["-y", "agentvault-tools"]
  }
}
```

### What happens next

Your agent can now:
- **Search**: "Find the latest Node.js release notes" → `web_search`
- **Read**: "What does that page say?" → `web_fetch`  
- **Remember**: "Remember that the API key is xyz" → `save_memory`
- **Recall**: "What was that API key?" → `search_memory`
- **Calculate**: "What's 15% of 2,450?" → `calc`
- **Time**: "What time is it in Tokyo?" → `datetime`

## Privacy

- **All data stays local**. Memory is stored at `~/.agentvault/memory.db`
- **No telemetry by default**. Set `AGENTVAULT_TELEMETRY=true` to opt in
- **Search queries and URLs are never sent** even with telemetry on

## Part of AgentVault

🏴‍☠️ **[AgentVault](https://github.com/hiroshic9-png/agentvault)** — The essential toolkit for AI agents.

| Package | What it does |
|---------|-------------|
| **agentvault-tools** | 🛠️ 9-tool MCP starter kit (you are here) |
| [agentvault-memory](https://www.npmjs.com/package/agentvault-memory) | 🧠 Local-first persistent memory (standalone) |
| [agentvault-guard](https://www.npmjs.com/package/agentvault-guard) | 🛡️ Tool poisoning detection |
| [agentvault-gateway](https://www.npmjs.com/package/agentvault-gateway) | 🔌 MCP proxy with audit logging |
| [agentvault-score](https://www.npmjs.com/package/agentvault-score) | 📊 Quality scoring (A+ to F) |
| [agentvault-retry](https://www.npmjs.com/package/agentvault-retry) | 🔄 Resilient calls with backoff |
| [agentvault-cache](https://www.npmjs.com/package/agentvault-cache) | ⚡ Smart result caching |

MIT License
