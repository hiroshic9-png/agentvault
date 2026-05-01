# 🏴‍☠️ AgentVault

[![npm: gateway](https://img.shields.io/npm/v/agentvault-gateway?label=gateway&color=cc3534)](https://www.npmjs.com/package/agentvault-gateway)
[![npm: guard](https://img.shields.io/npm/v/agentvault-guard?label=guard&color=cc3534)](https://www.npmjs.com/package/agentvault-guard)
[![npm: score](https://img.shields.io/npm/v/agentvault-score?label=score&color=cc3534)](https://www.npmjs.com/package/agentvault-score)
[![npm: retry](https://img.shields.io/npm/v/agentvault-retry?label=retry&color=cc3534)](https://www.npmjs.com/package/agentvault-retry)
[![npm: cache](https://img.shields.io/npm/v/agentvault-cache?label=cache&color=cc3534)](https://www.npmjs.com/package/agentvault-cache)
[![npm: tools](https://img.shields.io/npm/v/agentvault-tools?label=tools&color=cc3534)](https://www.npmjs.com/package/agentvault-tools)
[![JSR: @agentvault](https://jsr.io/badges/@agentvault)](https://jsr.io/@agentvault)
[![GitHub](https://img.shields.io/github/stars/hiroshic9-png/agentvault?style=social)](https://github.com/hiroshic9-png/agentvault)

> Making AI agents observable, secure, and accountable.

AgentVault is the data infrastructure for the AI agent economy. We build tools that generate trust scores, detect threats, and create intelligence from the MCP (Model Context Protocol) ecosystem.

🌐 **[Website](https://hiroshic9-png.github.io/agentvault/)** · 📦 **[npm](https://www.npmjs.com/search?q=agentvault)** · 📋 **[JSR](https://jsr.io/@agentvault)**

---

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`agentvault-gateway`](./gateway) | Audit-logging MCP proxy — sits between your agent and any MCP server | `npx agentvault-gateway` |
| [`agentvault-score`](./agentscore) | Automated quality & security scoring for MCP servers | `npx agentvault-score scan <target>` |
| [`agentvault-guard`](./guard) | Security middleware — tool poisoning detection, injection prevention | `npm i agentvault-guard` |
| [`agentvault-retry`](./retry) | Resilient MCP calls — exponential backoff, timeout, fallback | `npm i agentvault-retry` |
| [`agentvault-cache`](./cache) | Smart caching for MCP tool results — reduce latency & API costs | `npm i agentvault-cache` |
| [`agentvault-tools`](./tools) | **Free web search & fetch — zero API keys required** | `npx agentvault-tools` |

## Data Products

| Product | Description |
|---------|-------------|
| [AgentScore Dashboard](./agentscore/dashboard) | Real-time leaderboard of MCP server quality (localhost:3100) |
| [MCP Quality Report](./intelligence) | Quarterly analysis of ecosystem quality trends |
| [Daily Intelligence](./intelligence) | Daily market and competitive analysis |

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

## Quick Start

### Scan a MCP Server
```bash
npx agentvault-score scan "npx -y @modelcontextprotocol/server-memory"
```

### Proxy a MCP Server with Audit Logging
```bash
npx agentvault-gateway --target "npx -y @modelcontextprotocol/server-github"
```

### Protect Your Agent
```javascript
import { createGuard } from 'agentvault-guard';

const guard = createGuard({ mode: 'strict' });

// Before calling any tool:
const result = guard.check(toolName, args);
if (!result.allowed) {
    console.error('🔴 Blocked:', result.reason);
}
```

### Add Resilience
```javascript
import { withRetry } from 'agentvault-retry';

// Automatic retry with exponential backoff
const result = await withRetry(() => callTool('search', { query: 'test' }), {
    maxRetries: 3,
    timeoutMs: 5000,
});
```

### Cache Tool Results
```javascript
import { createCache } from 'agentvault-cache';

const cache = createCache({ ttlMs: 60000 });
const result = await cache.wrap('search:test', () => callTool('search', { query: 'test' }));
```

## Framework Integration

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
            args=["-y", "agentvault-gateway", "--target", "npx -y @modelcontextprotocol/server-github"],
        )
    ]
)
```

### Claude Desktop (`claude_desktop_config.json`)
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

## Current Leaderboard (Top 5)

| Rank | Server | Score | Grade | Tools |
|------|--------|-------|-------|-------|
| 🥇 | mcp-server-sqlite | 98/100 | A+ | 10 |
| 🥈 | @mapbox/mcp-server | 97/100 | A+ | 28 |
| 🥉 | mcp-server-kubernetes | 96/100 | A+ | 23 |
| 4 | server-everything | 94/100 | A+ | 13 |
| 5 | server-puppeteer | 91/100 | A+ | 7 |

> 21 servers scanned · Average: 89/100 · [Full leaderboard →](https://hiroshic9-png.github.io/agentvault/)

## License

MIT — Built by AgentVault 🏴‍☠️
