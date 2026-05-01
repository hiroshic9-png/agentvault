# 🏴‍☠️ AgentVault

[![npm: tools](https://img.shields.io/npm/v/agentvault-tools?label=tools&color=cc3534)](https://www.npmjs.com/package/agentvault-tools)
[![npm: memory](https://img.shields.io/npm/v/agentvault-memory?label=memory&color=cc3534)](https://www.npmjs.com/package/agentvault-memory)
[![npm: gateway](https://img.shields.io/npm/v/agentvault-gateway?label=gateway&color=cc3534)](https://www.npmjs.com/package/agentvault-gateway)
[![npm: guard](https://img.shields.io/npm/v/agentvault-guard?label=guard&color=cc3534)](https://www.npmjs.com/package/agentvault-guard)
[![npm: score](https://img.shields.io/npm/v/agentvault-score?label=score&color=cc3534)](https://www.npmjs.com/package/agentvault-score)
[![npm: retry](https://img.shields.io/npm/v/agentvault-retry?label=retry&color=cc3534)](https://www.npmjs.com/package/agentvault-retry)
[![npm: cache](https://img.shields.io/npm/v/agentvault-cache?label=cache&color=cc3534)](https://www.npmjs.com/package/agentvault-cache)
[![JSR: @agentvault](https://jsr.io/badges/@agentvault)](https://jsr.io/@agentvault)
[![GitHub](https://img.shields.io/github/stars/hiroshic9-png/agentvault?style=social)](https://github.com/hiroshic9-png/agentvault)

> The essential toolkit for AI agents — 9 tools in one install, zero API keys.

🌐 **[Website](https://hiroshic9-png.github.io/agentvault/)** · 📦 **[npm](https://www.npmjs.com/search?q=agentvault)** · 📋 **[JSR](https://jsr.io/@agentvault)** · 📊 **[Ecosystem Report](./intelligence/ecosystem-report-2026-05.md)**

---

## ⚡ 30-Second Start

```bash
npx agentvault-tools
```

That's it. Your agent now has **web search, persistent memory, calculator, and more** — no API keys, no config, no cost.

### Claude Desktop

```json
{
  "mcpServers": {
    "agentvault": {
      "command": "npx",
      "args": ["-y", "agentvault-tools"]
    }
  }
}
```

### Cursor / Windsurf

```json
{
  "mcpServers": {
    "agentvault": {
      "command": "npx",
      "args": ["-y", "agentvault-tools"]
    }
  }
}
```

---

## 🛠️ The Starter Kit — 9 Tools in One Package

`agentvault-tools` is the first package every AI agent should install:

| Category | Tool | What It Does |
|----------|------|-------------|
| 🌐 Web | `web_search` | DuckDuckGo search — no API key required |
| 🌐 Web | `web_fetch` | URL → clean text extraction |
| 🧠 Memory | `save_memory` | Persist text with tags & importance levels |
| 🧠 Memory | `search_memory` | Full-text search (SQLite FTS5) |
| 🧠 Memory | `list_memories` | Browse & filter by tag |
| 🧠 Memory | `delete_memory` | Remove entries |
| 🧠 Memory | `memory_stats` | Usage statistics |
| 🔧 Utility | `datetime` | Timezone conversion |
| 🔧 Utility | `calc` | Math expression evaluator |

Memory is **100% local** — your data stays on your machine. SQLite + FTS5, zero cloud dependency.

---

## 📦 All 7 Packages

| Package | Description | Install |
|---------|-------------|---------| 
| [`agentvault-tools`](./tools) | **MCP Starter Kit — 9 tools, zero config** | `npx agentvault-tools` |
| [`agentvault-memory`](./memory) | Local-first persistent memory (standalone) | `npx agentvault-memory` |
| [`agentvault-gateway`](./gateway) | MCP proxy with audit logging & telemetry | `npx agentvault-gateway` |
| [`agentvault-score`](./agentscore) | Quality & security scoring (A+ to F) | `npx agentvault-score scan <target>` |
| [`agentvault-guard`](./guard) | Tool poisoning detection & injection prevention | `npm i agentvault-guard` |
| [`agentvault-retry`](./retry) | Resilient calls — backoff, timeout, fallback | `npm i agentvault-retry` |
| [`agentvault-cache`](./cache) | Smart result caching — reduce latency & cost | `npm i agentvault-cache` |

---

## 📊 MCP Ecosystem Health

We patrol the MCP ecosystem daily with automated agents. Key findings:

- **57% of MCP servers on npm fail to connect** (26 of 46 tested)
- All failures produce the same error: `Connection closed`
- Many packages are published but broken or require undocumented setup
- 21 servers successfully scored, average quality: **89/100**
- 295 tools catalogued across operational servers

📋 **[Full Ecosystem Report →](./intelligence/ecosystem-report-2026-05.md)**

### Top Scored Servers

| Rank | Server | Score | Tools |
|------|--------|-------|-------|
| 🥇 | mcp-server-sqlite | 98/100 | 10 |
| 🥈 | @mapbox/mcp-server | 97/100 | 5 |
| 🥉 | mcp-server-kubernetes | 96/100 | 23 |
| 4 | server-everything | 94/100 | 13 |
| 5 | server-puppeteer | 91/100 | 7 |

---

## 🔒 Security

### Tool Poisoning Detection

```javascript
import { createGuard } from 'agentvault-guard';

const guard = createGuard({ mode: 'strict' });
const result = guard.check(toolName, args);
if (!result.allowed) {
    console.error('🔴 Blocked:', result.reason);
}
```

### Resilient Calls

```javascript
import { withRetry } from 'agentvault-retry';

const result = await withRetry(() => callTool('search', { query: 'test' }), {
    maxRetries: 3,
    timeoutMs: 5000,
});
```

### Cache Results

```javascript
import { createCache } from 'agentvault-cache';

const cache = createCache({ ttlMs: 60000 });
const result = await cache.wrap('search:test', () => callTool('search', { query: 'test' }));
```

---

## 🤖 Framework Integration

### CrewAI

```python
from crewai import Agent
from crewai.mcp import MCPServerStdio

agent = Agent(
    role="Research Analyst",
    goal="Gather data securely via audited MCP tools",
    mcps=[
        MCPServerStdio(
            command="npx",
            args=["-y", "agentvault-tools"],
        )
    ]
)
```

### Audited Proxy (for any server)

```json
{
  "mcpServers": {
    "github-audited": {
      "command": "npx",
      "args": ["-y", "agentvault-gateway", "--target", "npx -y @modelcontextprotocol/server-github"]
    }
  }
}
```

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI Agent    │────▶│  Gateway     │────▶│  MCP Server  │
│  (Claude,    │     │  (Proxy +    │     │  (Any npm    │
│   Cursor,    │     │   Telemetry) │     │   MCP pkg)   │
│   etc.)      │     └──────┬───────┘     └──────────────┘
└──────────────┘            │
                            ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Telemetry   │     │  AgentScore   │
                    │  Data Lake   │     │  Scan Data    │
                    └──────┬───────┘     └──────┬───────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────────────────────┐
                    │      Intelligence Engine     │
                    │   Quality Reports, Alerts,   │
                    │   Trust Scores, Rankings     │
                    └─────────────────────────────┘
```

## License

MIT — Built by AgentVault 🏴‍☠️
