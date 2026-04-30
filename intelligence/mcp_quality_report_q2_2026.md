# MCP Server Quality Report — Q2 2026
## Published by AgentVault | Data: April 30, 2026

---

## Executive Summary

AgentScore, an automated quality diagnostic engine, scanned **19 MCP servers** across the npm ecosystem — including official Anthropic servers, enterprise integrations (Notion, Mapbox, Railway), and popular community tools (Playwright, Kubernetes, DuckDuckGo).

### Key Findings

| Metric | Value |
|--------|-------|
| Servers Analyzed | 19 |
| Average Score | 90/100 |
| Total Tools Discovered | 284 |
| Grade A+ Servers | 8 (42%) |
| Grade A Servers | 11 (58%) |
| Grade B or Below | 0 (0%) |

**Every successfully scanned MCP server scored A or above.** The MCP ecosystem maintains high baseline quality, but significant gaps remain in documentation and protocol feature adoption.

---

## Score Leaderboard

| Rank | Server | Score | Grade | Tools | Category |
|------|--------|-------|-------|-------|----------|
| 🥇 | mcp-server-sqlite | 98 | A+ | 10 | Database |
| 🥈 | @mapbox/mcp-server | 97 | A+ | 18 | Geo/Maps |
| 🥉 | mcp-server-kubernetes | 96 | A+ | 23 | DevOps |
| 4 | server-everything (ref) | 94 | A+ | 13 | Reference |
| 5 | server-puppeteer | 91 | A+ | 7 | Browser |
| 5 | playwright-mcp-server | 91 | A+ | 33 | Browser |
| 7 | server-sequential-thinking | 90 | A+ | 1 | Reasoning |
| 7 | duckduckgo-mcp-server | 90 | A+ | 1 | Search |
| 9 | @railway/mcp-server | 89 | A | 14 | DevOps |
| 10 | server-github | 88 | A | 26 | Dev |
| 10 | @upstash/context7-mcp | 88 | A | 2 | Docs |
| 10 | tavily-mcp | 88 | A | 5 | Search |
| 10 | mcp-server-linear | 88 | A | — | PM |
| 14 | server-memory | 87 | A | 9 | Data |
| 14 | @notionhq/notion-mcp-server | 87 | A | 22 | Productivity |
| 16 | server-filesystem | 86 | A | 14 | Data |
| 16 | @mcp-get-community/server-curl | 86 | A | 1 | Network |
| 18 | chrome-devtools-mcp | 85 | A | 29 | Browser |
| 19 | mcp-server-discord | 82 | A | — | Social |

---

## Industry-Wide Quality Issues

### Critical Findings

#### 1. Tool Description Quality: Verb-First Pattern (156 violations)
The most prevalent issue across the entire ecosystem. **82% of all tools** fail to start their description with an action verb — a pattern critical for LLM tool selection.

**Impact**: When an AI agent sees `"A screenshot of the page"` vs `"Take a screenshot of the current page"`, the verb-first pattern dramatically improves tool selection accuracy.

**Recommendation**: All tool descriptions should follow the pattern: `[Verb] [object] [context]`
- ❌ `"A screenshot of the page"`
- ✅ `"Take a screenshot of the current page"`

#### 2. Schema Property Documentation (47 violations)
Almost half of all tools have **zero descriptions on their input parameters**. LLMs must guess what `"path"`, `"query"`, or `"options"` mean from context alone.

**Impact**: Undocumented parameters lead to incorrect tool calls, wasted tokens, and failed operations.

**Recommendation**: Every parameter should have a `description` field in its JSON Schema.

#### 3. Required Fields Not Declared (27 violations)
Many tools define parameters but fail to specify which ones are required. This forces agents to either provide all parameters (wasteful) or guess (error-prone).

#### 4. Protocol Feature Adoption Gap
| Feature | Adoption Rate |
|---------|--------------|
| Tools | 100% |
| Resources | 26% (5/19) |
| Prompts | 16% (3/19) |

**Only 5 out of 19 servers implement Resources, and only 3 implement Prompts.** The MCP specification offers a rich feature set, but the ecosystem is primarily tools-only.

#### 5. Security Patterns
Only **4 instances** of potentially dangerous tool patterns were detected (execute, drop-table in SQLite). The ecosystem is broadly safe, but database-access tools warrant additional scrutiny.

---

## Analysis by Category

### Browser Automation (3 servers, avg 89/100)
The most competitive category. Puppeteer, Playwright, and Chrome DevTools all scored A or above. **Playwright leads in tool count (33)** with comprehensive codegen and API testing capabilities.

### DevOps & Infrastructure (2 servers, avg 93/100)
Kubernetes and Railway are both excellent. Kubernetes is the **3rd highest scorer overall** with 23 tools covering the full kubectl + Helm spectrum.

### Search & Web (3 servers, avg 89/100)
DuckDuckGo (90/A+) stands out for simplicity — a single, perfectly documented tool. Tavily provides richer capabilities (5 tools) at the same grade level.

### Data & Storage (3 servers, avg 90/100)
**SQLite is the #1 scored server at 98/100** — full Resources + Prompts support, clean schemas. Memory (87) and Filesystem (86) lag behind on protocol features.

### Productivity (2 servers, avg 87/100)
Notion provides 22 tools covering the full API surface. A solid integration, but schema documentation needs work.

---

## Methodology

### Scoring Categories (100 points total)
| Category | Weight | Description |
|----------|--------|-------------|
| Tool Quality | 40% | Description quality, schema validation, documentation |
| Security | 30% | Dangerous pattern detection, tool poisoning, privilege analysis |
| Performance | 15% | Connection speed, response time |
| Resources | 5% | Resource endpoint implementation |
| Prompts | 5% | Prompt template support |
| Protocol | 5% | MCP specification compliance |

### Scanner Details
- **Engine**: AgentScore v0.1
- **Protocol**: MCP SDK stdio transport
- **Timeout**: 30 seconds per server
- **Date**: April 30, 2026

---

## About AgentVault

AgentVault is building the data infrastructure for the AI agent economy. Our mission is to make AI agents **observable, secure, and accountable** through automated quality intelligence.

- **AgentScore**: Automated MCP server quality diagnostics
- **AgentVault Gateway**: Audit-logging MCP proxy for production deployments
- **Intelligence Reports**: Weekly market analysis and quality benchmarks

---

*Next report: May 7, 2026 — Expanded to 50+ servers*

© 2026 AgentVault. Data collected by AgentScore v0.1.
