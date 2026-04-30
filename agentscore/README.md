# 🏴‍☠️ AgentScore

> Automated quality and security diagnostics for MCP servers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What is AgentScore?

AgentScore scans any MCP (Model Context Protocol) server and generates a quality score from 0-100 across 6 categories:

| Category | Weight | What It Measures |
|----------|--------|-----------------|
| **Tool Quality** | 40% | Description quality, schema validation, parameter documentation |
| **Security** | 30% | Dangerous patterns, tool poisoning, privilege analysis |
| **Performance** | 15% | Connection speed, response latency |
| **Resources** | 5% | Resource endpoint support |
| **Prompts** | 5% | Prompt template support |
| **Protocol** | 5% | MCP specification compliance |

## Quick Start

### Scan a single server
```bash
npx agentscore scan "npx -y @modelcontextprotocol/server-memory"
```

### Batch scan from a file
```bash
npx agentscore batch targets.txt
```

### Output
```
  ┌─────────────────────────────────────┐
  │  AgentScore: 87/100  Grade: A      │
  │  █████████████████░░░              │
  └─────────────────────────────────────┘
  📦 Tools: 9  📂 Resources: 0  💬 Prompts: 0

  Category Breakdown:
    tool_quality    ▓▓▓▓▓▓▓▓▓░ 37/40
    security        ▓▓▓▓▓▓▓▓▓▓ 30/30
    performance     ▓▓▓▓▓▓▓▓▓▓ 15/15
```

## Grading Scale

| Grade | Score Range |
|-------|------------|
| A+ | 90-100 |
| A | 80-89 |
| B | 70-79 |
| C | 60-69 |
| D | 50-59 |
| F | 0-49 |

## Dashboard

AgentScore includes a built-in web dashboard for visualizing scan results:

```bash
node dashboard/server.js
# 🏴‍☠️ AgentScore Dashboard: http://localhost:3100
```

## Data Output

All scan results are saved as JSONL to `reports/scores_YYYY-MM-DD.jsonl` for analysis and tracking.

## Security Checks

AgentScore detects:
- 🔴 **Tool Poisoning** — Hidden instructions in tool descriptions targeting AI agents
- 🔴 **Dangerous Patterns** — `exec`, `shell`, `delete`, `drop` in tool names
- 🟡 **Privilege Escalation** — High proportion of write/delete operations
- 🟡 **Missing Input Validation** — Parameters without type constraints

## Part of AgentVault

AgentScore is a data collection device in the [AgentVault](https://github.com/agentvault) ecosystem — making AI agents observable, secure, and accountable.

## License

MIT
