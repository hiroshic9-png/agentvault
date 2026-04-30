# 🏴‍☠️ AgentVault

[![npm: gateway](https://img.shields.io/npm/v/agentvault-gateway?label=gateway&color=cc3534)](https://www.npmjs.com/package/agentvault-gateway)
[![npm: guard](https://img.shields.io/npm/v/agentvault-guard?label=guard&color=cc3534)](https://www.npmjs.com/package/agentvault-guard)
[![npm: score](https://img.shields.io/npm/v/agentvault-score?label=score&color=cc3534)](https://www.npmjs.com/package/agentvault-score)
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

## License

MIT — Built by AgentVault 🏴‍☠️
