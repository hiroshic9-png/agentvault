# 🏴‍☠️ AgentVault — 告知コンテンツ集

> 投稿先別に最適化した告知文。オーナーがコピペで使えるように。

---

## 1. Hacker News (Show HN)

### タイトル
```
Show HN: AgentVault – Open-source security and quality scoring for MCP servers
```

### 本文
```
Hi HN,

I built AgentVault — a set of open-source tools for auditing and securing AI agent tool integrations (MCP servers).

The MCP ecosystem is growing fast (100+ npm packages), but there's no way to know if a server is well-built, secure, or even functional before you connect your AI agent to it.

AgentVault solves this with three tools:

1. **AgentScore** — Automated quality scoring (A+ to F) for any MCP server. We've already scanned 21 servers and found the average quality score is 89/100. SQLite scored highest (98/100).

2. **AgentGuard** — Runtime security middleware that detects tool poisoning attacks (hidden instructions in tool descriptions that trick your agent).

3. **AgentGateway** — A transparent MCP proxy that logs every tool call your agent makes, with zero code changes.

All three are on npm:
- `npm i agentvault-score`
- `npm i agentvault-guard`
- `npm i agentvault-gateway`

Live leaderboard: https://hiroshic9-png.github.io/agentvault/
GitHub: https://github.com/hiroshic9-png/agentvault

We're also running automated daily scans via GitHub Actions to track quality trends over time.

Happy to answer questions about MCP security, tool poisoning, or the scoring methodology.
```

---

## 2. Reddit (r/MachineLearning, r/LocalLLaMA, r/ChatGPTCoding)

### r/MachineLearning タイトル
```
[P] AgentVault: Open-source quality scoring and security tools for MCP (Model Context Protocol) servers
```

### r/LocalLLaMA タイトル
```
I built an automated quality scanner for MCP servers — here are the results from scanning 21 servers
```

### 本文 (共通)
```
The MCP ecosystem now has 100+ npm packages, but there's no quality control. I built AgentVault to fix this.

**What it does:**
- Scans any MCP server and gives it a quality score (A+ to F)
- Detects tool poisoning attacks (hidden instructions in tool descriptions)
- Proxies all agent-to-server traffic with full audit logging

**Interesting findings from scanning 21 servers:**
- Average quality: 89/100
- Top 3: SQLite (98), Mapbox (97), Kubernetes (96)
- Most servers lack proper input schemas
- Some have descriptions over 500 chars (potential poisoning vector)

**Try it:**
```bash
npx agentvault-score scan "npx -y @modelcontextprotocol/server-memory"
```

GitHub: https://github.com/hiroshic9-png/agentvault
npm: `npm i agentvault-score`
```

---

## 3. X (Twitter) — スレッド形式

### ツイート1
```
🏴‍☠️ I scanned 21 MCP servers and scored their quality.

Results:
🥇 SQLite — 98/100
🥈 Mapbox — 97/100  
🥉 Kubernetes — 96/100

Average: 89/100

Most servers have decent tool quality, but almost none validate input schemas properly.

Full leaderboard → https://hiroshic9-png.github.io/agentvault/
```

### ツイート2
```
Tool poisoning is a real threat in the MCP ecosystem.

A malicious server can hide "ignore previous instructions" in a tool description, and your AI agent will follow it.

I built AgentGuard to detect this automatically:
npm i agentvault-guard

Open source: github.com/hiroshic9-png/agentvault
```

### ツイート3
```
Want to audit every tool call your AI agent makes?

AgentVault Gateway = transparent MCP proxy with zero code changes.

npx agentvault-gateway --target "your-mcp-server"

Every request is logged. Every response is tracked. Full audit trail.

🏴‍☠️ github.com/hiroshic9-png/agentvault
```

---

## 4. Dev.to / Hashnode ブログ記事タイトル案

```
I Scanned 21 MCP Servers — Here's What I Found About AI Agent Security
```

```
Tool Poisoning: The Hidden Threat in Your AI Agent's MCP Tools
```

```
Building an Open-Source Quality Score for the MCP Ecosystem
```

---

## 投稿タイミング推奨

| プラットフォーム | 最適時間 (UTC) | 最適時間 (JST) |
|----------------|---------------|---------------|
| Hacker News | 火曜 14:00-16:00 | 火曜 23:00-翌1:00 |
| Reddit ML | 月曜 15:00-17:00 | 月曜 24:00-翌2:00 |
| X (Twitter) | 水曜 13:00-15:00 | 水曜 22:00-24:00 |

> 今日は木曜(JST)なので、**今日中にX投稿 → 来週火曜にHN投稿**が最適。
